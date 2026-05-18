import { redirect, type Actions } from "@sveltejs/kit";
import { prisma } from "$utils/prisma";
import type { PageServerLoad } from "./$types";
import UserUtils from "$utils/user";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ }) => { }

export const actions = {
    default: async ({ request, cookies }) => {
        const formData = await request.formData();
        const name = formData.get("name") as string;
        const nickname = formData.get("nickname") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirm-password") as string;

        if (!email || !password || !confirmPassword) {
            return fail(
                400,
                {
                    success: false,
                    message: "Por favor, completa todos los campos requeridos",
                },
            );
        }

        if (password !== confirmPassword) {
            return fail(
                400,
                {
                    success: false,
                    message: "Contraseñas no coinciden",
                }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return fail(
                400,
                {
                    success: false,
                    message: "Ya existe una cuenta con ese correo electrónico",
                }
            );
        }

        const hashedPassword = UserUtils.hashPassword(password);

        const nombre_cumple = /^[a-zA-Z]+ [a-zA-Z]+$/.test(name);

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                nombre: name,
                apodo: nickname,
                es_valido: nombre_cumple,
            },
        });

        await sendEmailValidator(email);

        return {
            success: true,
        };
    }
} satisfies Actions;

import { sendEmail } from "$lib/email/resend";
import { encript_string } from "$utils/encript";

const sendEmailValidator = async (to: string) => {
    const validationKey = encript_string(to);

    const uriDirectory = process.env.ORIGIN || "http://localhost:5173/";

    const subject = "Bienvenido a GGOO";
    const html = `<p>Hola ${to},</p>
    <h1> ¡Bienvenido a GGOO!</h1>
    <p>Gracias por registrarte en GGOO. Estamos emocionados de tenerte con nosotros.</p>
    <p>¡Esperamos que disfrutes de la experiencia!</p>
    <p>Saludos,<br/>El equipo de GGOO</p>

    <h3>Para validar tu cuenta, haz clic en el siguiente enlace:</h3>
    <a href="${uriDirectory}auth/verify?code=${validationKey}">Validar cuenta</a>
    <h3>Una vez validada tu cuenta, podrás iniciar sesión deberas esperar a que un administrador acepte tu ingreso</h3>
    
    <h3>Si no te registraste en GGOO, puedes ignorar este correo electrónico.</h3>

    
    `;
    await sendEmail(to, subject, html);
}