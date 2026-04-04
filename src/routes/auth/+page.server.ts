import type { Actions } from "@sveltejs/kit";
import { prisma } from "$utils/prisma";
import type { PageServerLoad } from "./$types";
import UserUtils from "$utils/user";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ }) => { }

export const actions = {
    login: async ({ request, cookies }) => {
        console.log("login action");
        const formData = await request.formData();
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!email || !password) {
            return fail(400, {
                success: false,
                message: "El email y la contraseña son requeridos",
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return fail(400, {
                success: false,
                message: "Usuario no encontrado",
            });
        }

        const isPasswordValid = await UserUtils.verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return fail(400, {
                success: false,
                message: "Contraseña incorrecta",
            });
        }

        if (!user.es_valido) {
            return fail(400, {
                success: false,
                message: "Debes validar tu cuenta en tu correo electrónico antes de iniciar sesión",
            });
        }

        if (!user.aprobado_por_admin) {
            return fail(400, {
                success: false,
                message: "Tu cuenta está pendiente de aprobación por un administrador. Por favor, espera a que un administrador revise tu cuenta.",
            });
        }

        const [token, refreshToken] = UserUtils.generateTokens(user);
        cookies.set(
            "token",
            token,
            {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60, // 1 hour
            }
        );
        cookies.set(
            "refreshToken",
            refreshToken,
            {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 7, // 1 hour
            }
        );
        return {
            success: true,
        };
    },
    logout: async ({ cookies }) => {
        cookies.delete("token", { path: "/" });
        cookies.delete("refreshToken", { path: "/" });
        return redirect(302, "/auth");
    }
} satisfies Actions;