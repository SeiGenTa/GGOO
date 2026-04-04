import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    console.log("Redirecting to /app");
    redirect(302, "/app");
}