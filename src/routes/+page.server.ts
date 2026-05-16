import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import logger from "$lib/logger";

export const load: PageServerLoad = async () => {
    logger.info("Redirecting to /app...")
    redirect(302, "/app");
}