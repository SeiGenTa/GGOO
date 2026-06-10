import { createHash, randomBytes } from 'node:crypto'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { type RefreshToken, type User } from '$generated/prisma/client'
import { prisma } from './prisma'
import { Permissions } from '$lib/permissions'
import logger from '$lib/logger'

const VERSION_JWT = 2

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ACCESS_TOKEN_TTL = '15m'
const CLEANUP_PROBABILITY = 0.01
const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

type GeneratedTokens = {
    accessToken: string
    refreshToken: string
}

type RefreshTokenRevokeReason =
    | 'rotacion'
    | 'logout'
    | 'cambio_password'
    | 'limpieza'

class UserUtils {
    public static hashPassword = (password: string): string => {
        const hasher = createHash('blake2b512')
        hasher.update(password)
        return hasher.digest('hex')
    }

    public static verifyPassword = (
        password: string,
        hash: string
    ): boolean => {
        const hashedPassword = UserUtils.hashPassword(password)
        return hashedPassword === hash
    }

    private static hashRefreshToken = (raw: string): string => {
        return createHash('sha256').update(raw).digest('hex')
    }

    private static generateRefreshTokenRaw = (): string => {
        return randomBytes(48).toString('base64url')
    }

    private static maybeCleanupExpired = async (): Promise<void> => {
        if (Math.random() < CLEANUP_PROBABILITY) {
            await UserUtils.cleanupExpiredRefreshTokens()
        }
    }

    public static cleanupExpiredRefreshTokens = async (): Promise<number> => {
        const now = new Date()
        const revokedRetentionThreshold = new Date(
            now.getTime() - REVOKED_RETENTION_MS
        )
        const result = await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { fechaExpiracion: { lt: now } },
                    {
                        esValido: false,
                        revocadoEn: { lt: revokedRetentionThreshold },
                    },
                ],
            },
        })
        return result.count
    }

    private static generateAccessToken = async (
        user: User
    ): Promise<string> => {
        const payload = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            permisos: await UserUtils.get_user_permissions(user),
            apodo: user.apodo,
            es_admin: user.es_admin,
            version: VERSION_JWT,
            posiciones: user.posiciones,
            cumpleanos: user.cumpleanos,
        }
        const secretKey = process.env.SECRET_KEY || 'your_secret_key_here'
        return jwt.sign(payload, secretKey, { expiresIn: ACCESS_TOKEN_TTL })
    }

    public static createRefreshToken = async (
        user: User,
        ip: string | null,
        userAgent: string | null
    ): Promise<string> => {
        await UserUtils.maybeCleanupExpired()
        const raw = UserUtils.generateRefreshTokenRaw()
        const tokenHash = UserUtils.hashRefreshToken(raw)
        const fechaExpiracion = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        await prisma.refreshToken.create({
            data: {
                token: tokenHash,
                userId: user.id,
                ip,
                userAgent,
                fechaExpiracion,
            },
        })
        return raw
    }

    public static generateTokens = async (
        user: User,
        ip: string | null = null,
        userAgent: string | null = null
    ): Promise<GeneratedTokens> => {
        const accessToken = await UserUtils.generateAccessToken(user)
        const refreshToken = await UserUtils.createRefreshToken(
            user,
            ip,
            userAgent
        )
        return { accessToken, refreshToken }
    }

    public static verifyRefreshToken = async (
        raw: string
    ): Promise<RefreshToken | null> => {
        await UserUtils.maybeCleanupExpired()
        if (!raw || raw.length === 0) {
            return null
        }
        const tokenHash = UserUtils.hashRefreshToken(raw)
        const record = await prisma.refreshToken.findUnique({
            where: { token: tokenHash },
        })
        if (!record) {
            return null
        }
        if (!record.esValido) {
            return null
        }
        if (record.fechaExpiracion.getTime() <= Date.now()) {
            return null
        }
        return record
    }

    public static rotateRefreshToken = async (
        raw: string,
        ip: string | null = null,
        userAgent: string | null = null
    ): Promise<GeneratedTokens | null> => {
        await UserUtils.maybeCleanupExpired()
        if (!raw || raw.length === 0) {
            return null
        }
        const tokenHash = UserUtils.hashRefreshToken(raw)
        const now = new Date()

        return await prisma.$transaction(async (tx) => {
            const record = await tx.refreshToken.findUnique({
                where: { token: tokenHash },
            })
            if (
                !record ||
                !record.esValido ||
                record.fechaExpiracion.getTime() <= now.getTime()
            ) {
                return null
            }

            const user = await tx.user.findUnique({
                where: { id: record.userId },
            })
            if (!user) {
                return null
            }

            await tx.refreshToken.update({
                where: { id: record.id },
                data: {
                    esValido: false,
                    revocadoEn: now,
                    motivoRevocacion: 'rotacion',
                },
            })

            const newRaw = UserUtils.generateRefreshTokenRaw()
            const newHash = UserUtils.hashRefreshToken(newRaw)
            const fechaExpiracion = new Date(
                now.getTime() + REFRESH_TOKEN_TTL_MS
            )
            await tx.refreshToken.create({
                data: {
                    token: newHash,
                    userId: user.id,
                    ip,
                    userAgent,
                    fechaExpiracion,
                },
            })

            const accessToken = await UserUtils.generateAccessToken(user)
            logger.info(
                {
                    action: 'refresh_token_rotated',
                    userId: user.id,
                    email: user.email,
                    ip,
                    userAgent,
                },
                'Refresh token rotado correctamente'
            )
            return { accessToken, refreshToken: newRaw }
        })
    }

    public static revokeRefreshToken = async (
        raw: string,
        motivo: RefreshTokenRevokeReason = 'logout'
    ): Promise<boolean> => {
        if (!raw || raw.length === 0) {
            return false
        }
        const tokenHash = UserUtils.hashRefreshToken(raw)
        const now = new Date()
        const result = await prisma.refreshToken.updateMany({
            where: {
                token: tokenHash,
                esValido: true,
            },
            data: {
                esValido: false,
                revocadoEn: now,
                motivoRevocacion: motivo,
            },
        })
        return result.count > 0
    }

    public static revokeAllUserRefreshTokens = async (
        userId: string,
        motivo: RefreshTokenRevokeReason = 'cambio_password'
    ): Promise<number> => {
        const now = new Date()
        const result = await prisma.refreshToken.updateMany({
            where: {
                userId,
                esValido: true,
            },
            data: {
                esValido: false,
                revocadoEn: now,
                motivoRevocacion: motivo,
            },
        })
        logger.info(
            {
                action: 'refresh_tokens_revoked_all',
                userId,
                motivo,
                count: result.count,
            },
            `Se revocaron ${result.count} refresh tokens del usuario`
        )
        return result.count
    }

    public static has_permission = async (
        user: User,
        permission: Permissions
    ): Promise<boolean> => {
        if (user.es_admin) {
            return true
        }
        const permissions = user.permisos
        if (permissions.includes(permission)) {
            return true
        }

        const roles = await prisma.rol.findMany({
            select: {
                permisos: true,
            },
            where: {
                users: {
                    some: {
                        id: user.id,
                    },
                },
            },
        })
        const permissions_from_roles = roles.flatMap((role) => role.permisos)
        if (permissions_from_roles.includes(permission)) {
            return true
        }

        return false
    }

    public static get_user_permissions = async (
        user: User
    ): Promise<string[]> => {
        if (user.es_admin) {
            return Object.values(Permissions)
        }
        const permissions = user.permisos

        const roles = await prisma.rol.findMany({
            select: {
                permisos: true,
            },
            where: {
                users: {
                    some: {
                        id: user.id,
                    },
                },
            },
        })
        const permissions_from_roles = roles.flatMap((role) => role.permisos)
        return [...new Set([...permissions, ...permissions_from_roles])]
    }

    public static verifyToken = async (token: string) => {
        const secretKey = process.env.SECRET_KEY || 'your_secret_key_here'
        let decoded
        try {
            decoded = jwt.verify(token, secretKey)
        } catch (err) {
            return null
        }
        return {
            id: (decoded as JwtPayload).id,
            email: (decoded as JwtPayload).email,
            nombre: (decoded as JwtPayload).nombre,
            apodo: (decoded as JwtPayload).apodo,
            es_admin: (decoded as JwtPayload).es_admin,
            permisos: (decoded as JwtPayload).permisos,
            posiciones: (decoded as JwtPayload).posiciones,
            cumpleanos: (decoded as JwtPayload).cumpleanos ?? null,
        } as {
            id: string
            email: string
            nombre: string
            apodo: string
            es_admin: boolean
            permisos: string[]
            posiciones: string[]
            cumpleanos: Date | null
        }
    }
}

export default UserUtils
