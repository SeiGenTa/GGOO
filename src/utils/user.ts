import { createHash, randomBytes } from 'node:crypto'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { type RefreshToken, type User } from '$generated/prisma/client'
import { prisma } from './prisma'
import { Permissions } from '$lib/permissions'
import {
    PERMISSION_BITS,
    permisosToBitmask,
    tienePermiso,
} from '$lib/server/permissions'
import logger from '$lib/logger'

/**
 * Versión del esquema del payload JWT.
 *
 * v3: el campo `permisos` pasa de `string[]` a `number` (bitmask).
 *     Bump de v2 -> v3 para forzar la re-emisión de tokens en vuelo
 *     durante el deploy y prevenir inconsistencias con el chequeo de
 *     versión añadido en `verifyToken`.
 */
const VERSION_JWT = 3

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ACCESS_TOKEN_TTL = '15m'
const CLEANUP_PROBABILITY = 0.01
const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Helper privado: traduce un nombre de permiso del enum a su bit
 * correspondiente. Se usa en métodos legacy que reciben el enum
 * `Permissions` en lugar del bit directo.
 */
const _permToBit = (permission: Permissions): number =>
    PERMISSION_BITS[permission] ?? 0

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
        // Empaquetamos todos los permisos del usuario (resueltos desde DB
        // + roles) en un único entero. Esto reduce el payload del JWT de
        // ~1.1 KB a ~200 bytes y evita el 502 Bad Gateway en producción
        // cuando Nginx reenvía la cookie con `proxy_buffering off`.
        const permisosArray = await UserUtils.get_user_permissions(user)
        const payload = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            permisos: permisosToBitmask(permisosArray),
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
        // Comprobamos primero los permisos directos del usuario.
        if (user.permisos.includes(permission)) {
            return true
        }

        // Luego añadimos los permisos provenientes de sus roles.
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

    /**
     * Variante síncrona que opera sobre el bitmask ya resuelto.
     *
     * Usar cuando el caller ya dispone del bitmask (típicamente desde
     * `event.locals.user.permisos` o tras un `get_user_permissions`).
     * O(1), sin acceso a DB.
     *
     * Si el caller solo tiene el `User` de Prisma, llamar a
     * `get_user_permissions(user)` para obtener el array de strings
     * y luego `permisosToBitmask` para convertirlo.
     */
    public static hasPermissionMask = (
        bitmaskUsuario: number,
        permission: Permissions,
        esAdmin: boolean = false
    ): boolean => {
        if (esAdmin) return true
        return tienePermiso(bitmaskUsuario, _permToBit(permission))
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
        const payload = decoded as JwtPayload & {
            version?: number
            permisos?: number
        }
        // Rechazamos tokens emitidos con versiones anteriores del esquema
        // (v2 = string[]). Esto fuerza al cliente a refrescar y obtener
        // un token v3 con el bitmask.
        if (payload.version !== VERSION_JWT) {
            return null
        }
        return {
            id: payload.id,
            email: payload.email,
            nombre: payload.nombre,
            apodo: payload.apodo,
            es_admin: payload.es_admin,
            permisos: payload.permisos ?? 0,
            posiciones: payload.posiciones,
            cumpleanos: payload.cumpleanos ?? null,
        } as {
            id: string
            email: string
            nombre: string
            apodo: string | null
            es_admin: boolean
            permisos: number
            posiciones: string[]
            cumpleanos: Date | null
        }
    }
}

export default UserUtils
