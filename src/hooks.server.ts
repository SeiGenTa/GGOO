import UserUtils from '$utils/user'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
    const cookies = event.cookies
    let token = cookies.get('token')
    let refreshToken = cookies.get('refreshToken')

    //? Logica para refrescar el token si es necesario
    if (refreshToken && !token) {
        const newTokens = await UserUtils.generateNewTokensFromRefreshToken(refreshToken);
        if (newTokens) {
            token = newTokens.token;
            refreshToken = newTokens.refreshToken;
            cookies.set('token', token, { path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
            cookies.set('refreshToken', refreshToken, { path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
        }
        else {
            cookies.delete('token', { path: '/' });
            cookies.delete('refreshToken', { path: '/' });
        }
    }

    const user = token ? await UserUtils.verifyToken(token) : null
    if (user) {
        event.locals.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apodo: user.apodo,
            es_admin: user.es_admin,
            permisos: user.permisos,
        }
    }

    return resolve(event)
}
