import { decrypt_string } from "$utils/encript";
import { prisma } from "$utils/prisma";
import { createDecipheriv, createHash } from "node:crypto";

export const load = async ({ url }) => {
    const code = url.searchParams.get("code");
    if (!code) {
        return {
            success: false,
            title: "Error de verificación",
            message: "Código de verificación no proporcionado",
        };
    }

    const email = decrypt_string(code);
    if (!email) {
        return {
            success: false,
            title: "Error de verificación",
            message: "Código de verificación inválido",
        };
    }

    await prisma.user.updateMany({
        where: {
            email,
        },
        data: {
            es_valido: true,
        },
    });
    
    return {
        success: true,
        title: "Cuenta verificada",
        message: `La cuenta con el correo ${email} ha sido verificada exitosamente. Ahora puedes iniciar sesión.`,
    }
}