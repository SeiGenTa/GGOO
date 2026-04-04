import type { Actions } from "@sveltejs/kit";
import { prisma } from "$utils/prisma";
import type { PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { randomBytes } from "node:crypto";

export const load: PageServerLoad = async ({ }) => { }

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
            return fail(400, {
                success: false,
                message: "No existe una cuenta asociada a ese correo",
            });
        }

        // Generar token temporal para recuperación (TODO: persistir y enviar por correo)
        const token = randomBytes(32).toString("hex");

        // TODO: Persistir token en DB y enviar correo con enlace de recuperación
        // Ejemplo: await sendResetEmail(email, token)

        return {
            success: true,
        };
    }
} satisfies Actions;
