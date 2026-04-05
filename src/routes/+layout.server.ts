import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies, url, locals, depends }) => {
    depends("auth:check");
    const token = cookies.get("token");
    if (!token && (url.pathname !== "/auth" && !url.pathname.startsWith("/auth/"))) {
        redirect(302, "/auth?next=" + url.pathname);
    }
    if (token && url.pathname === "/auth") {
        redirect(302, "/app");
    }

    let toasts = []

    if (url.searchParams.get("error")) {
        toasts.push({
            type: "error",
            message: url.searchParams.get("error")!,
        });
    }

    return {
        user: locals.user,
        toast: toasts,
    }
}