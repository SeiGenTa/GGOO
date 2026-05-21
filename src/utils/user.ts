import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { type User } from "$generated/prisma/client";
import { prisma } from "./prisma";
import { Permissions } from "$lib/permissions";

const VERSION_JWT = 2;

class UserUtils {
    public static hashPassword = (password: string): string => {
        const hasher = createHash("blake2b512");
        hasher.update(password);
        return hasher.digest("hex");
    }

    public static verifyPassword = (password: string, hash: string): boolean => {
        const hashedPassword = UserUtils.hashPassword(password);
        return hashedPassword === hash;
    }

    public static generateTokens = async (user: User) => {
        const payload = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            permisos: await UserUtils.get_user_permissions(user),
            apodo: user.apodo,
            es_admin: user.es_admin,
            version: VERSION_JWT,
            posiciones: user.posiciones,
        };
        const payload_refresh = {
            id: user.id,
            email: user.email,
            password: user.password,
            version: VERSION_JWT,
        }
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        const token = jwt.sign(payload, secretKey, { expiresIn: "15m" });
        const refreshToken = jwt.sign(payload_refresh, secretKey, { expiresIn: "7d" });
        return [token, refreshToken];
    }

    public static has_permission = async (user: User, permission: Permissions): Promise<boolean> => {
        if (user.es_admin) {
            return true;
        }
        const permissions = user.permisos;
        if (permissions.includes(permission)) {
            return true;
        };

        const roles = await prisma.rol.findMany({
            select: {
                permisos: true,
            },
            where: {
                users: {
                    some: {
                        id: user.id,
                    }
                }
            },
        }
        )
        const permissions_from_roles = roles.flatMap(role => role.permisos);
        if (permissions_from_roles.includes(permission)) {
            return true;
        }

        return false;
    }

    public static get_user_permissions = async (user: User): Promise<string[]> => {
        if (user.es_admin) {
            return Object.values(Permissions);
        }
        const permissions = user.permisos;

        const roles = await prisma.rol.findMany({
            select: {
                permisos: true,
            },
            where: {
                users: {
                    some: {
                        id: user.id,
                    }
                }
            },
        }
        )
        const permissions_from_roles = roles.flatMap(role => role.permisos);
        return [...new Set([...permissions, ...permissions_from_roles])];
    }

    public static generateNewTokensFromRefreshToken = async (refreshToken: string) => {
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, secretKey);
        } catch (err) {
            return null;
        }
        if ((decoded as JwtPayload).version !== VERSION_JWT) {
            return null;
        }
        const user = await prisma.user.findUnique({
            where: {
                id: (decoded as JwtPayload).id,
                password: (decoded as JwtPayload).password,
            },
        });

        if (!user) {
            return null;
        }

        const [token_generated, refresh_token_generated] = await UserUtils.generateTokens(user);
        return {
            token: token_generated,
            refreshToken: refresh_token_generated,
        }
    }

    public static verifyToken = async (token: string) => {
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
        } catch (err) {
            return null;
        }
        return {
            id: (decoded as JwtPayload).id,
            email: (decoded as JwtPayload).email,
            nombre: (decoded as JwtPayload).nombre,
            apodo: (decoded as JwtPayload).apodo,
            es_admin: (decoded as JwtPayload).es_admin,
            permisos: (decoded as JwtPayload).permisos,
            posiciones: (decoded as JwtPayload).posiciones,
        } as {
            id: string;
            email: string;
            nombre: string;
            apodo: string;
            es_admin: boolean;
            permisos: string[];
            posiciones: string[];
        };
    }
}

export default UserUtils;