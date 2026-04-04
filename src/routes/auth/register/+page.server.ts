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
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                nombre: name,
                apodo: nickname,
            },
        });

        return {
            success: true,
        };
    }
} satisfies Actions;