import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import UserUtils from "$utils/user";

export const load: LayoutServerLoad = async ({ cookies, url, locals, depends}) => {
    depends("auth:check");
    const token = cookies.get("token");
    if (!token && (url.pathname !== "/auth" && !url.pathname.startsWith("/auth/"))) {
        redirect(302, "/auth?next=" + url.pathname);
    }
    if (token && url.pathname === "/auth") {
        redirect(302, "/app");
    }

    if (token) {
        const user = await UserUtils.verifyToken(token);
        if (!user) {
            cookies.delete("token", { path: "/" });
            redirect(302, "/auth?next=" + url.pathname);
        }
        locals.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apodo: user.apodo,
            es_admin: user.es_admin,
        };
    }
    return {
        user: locals.user,
    }
}