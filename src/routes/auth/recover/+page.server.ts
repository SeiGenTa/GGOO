import type { Actions } from "@sveltejs/kit";
import { prisma } from "$utils/prisma";
import type { PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { sendEmail } from "$lib/email/resend";
import logger from "$lib/logger";

export const load: PageServerLoad = async ({ }) => { }

const RECOVER_REASON = "recover_password";

type RecoverJwtPayload = {
    email: string;
    reason: string;
    password: string;
};

const sendRecoverPasswordEmail = async (to: string, recoverLink: string) => {
    const subject = "Recuperacion de clave";
    const html = `
        <p>Hola,</p>
        <p>Recibimos una solicitud para recuperar tu clave en GGOO.</p>
        <p>Para cambiar tu clave, accede al siguiente enlace:</p>
        <a href="${recoverLink}">Cambiar clave</a>
        <p>Si no puedes acceder, copia y pega este enlace en tu navegador:</p>
        <p>${recoverLink}</p>
        <p>Este enlace expira en 1 hora.</p>
    `;

    await sendEmail(to, subject, html);
};

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const email = (formData.get("email") as string || "").trim();

        if (!email) {
            return fail(400, {
                success: false,
                message: "El correo es requerido",
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            logger.info({ action: "action_recover_password_user_not_found", email }, "Solicitud de recuperacion para correo inexistente");
            return {
                success: true,
            };
        }

        const payload: RecoverJwtPayload = {
            email: user.email,
            reason: RECOVER_REASON,
            password: user.password,
        };
        const secretKey = process.env.SECRET_KEY || "your_secret_key_here";
        const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
        const origin = process.env.ORIGIN ?? "http://localhost:5173/";
        const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
        const resetUrl = `${normalizedOrigin}/auth/recover/change_password?token=${encodeURIComponent(token)}`;

        await sendRecoverPasswordEmail(user.email, resetUrl);
        logger.info({ action: "action_recover_password_email_sent", userId: user.id, email: user.email }, "Correo de recuperacion de clave enviado");

        //redirect(303, resetUrl);
        redirect(303, "/auth");
    }
} satisfies Actions;
