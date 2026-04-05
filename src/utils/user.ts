import { createHash } from "node:crypto";
import jwt, { type Jwt, type JwtPayload } from 'jsonwebtoken';
import { type User } from "$generated/prisma/client";
import { prisma } from "./prisma";

class UserUtils{
    public static hashPassword = (password: string): string => {
        const hasher = createHash("blake2b512");
        hasher.update(password);
        return hasher.digest("hex");
    }

    public static verifyPassword = (password: string, hash: string): boolean => {
        const hashedPassword = UserUtils.hashPassword(password);
        return hashedPassword === hash;
    }

    public static generateTokens = (user: User) => {
        const payload = {
            id: user.id,
            email: user.email,
        };
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
        const refreshToken = jwt.sign(payload, secretKey, { expiresIn: "7d" });
        return [token, refreshToken];
    }

    public static has_permission = (user: User, permission: Permissions): boolean => {
        if (user.es_admin) {
            return true;
        }
        return false;
    }

    public static verifyToken = (token: string) => {
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
        } catch (err) {
            return null;
        }
        const user = prisma.user.findUnique({
            where: {
                id: (decoded as JwtPayload).id,
            },
        });
        return user;
    }
}

export default UserUtils;