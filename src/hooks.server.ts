import UserUtils from '$utils/user';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const cookies = event.cookies;
    const token = cookies.get("token");

    const user = token ? await UserUtils.verifyToken(token) : null;
    if (user) {
        event.locals.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apodo: user.apodo,
            es_admin: user.es_admin,
        };
    }

	const response = await resolve(event);
	return response;
};