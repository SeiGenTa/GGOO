import UserUtils from '$utils/user'
import type { Handle } from '@sveltejs/kit'
import logger from '$lib/logger'

export const handle: Handle = async ({ event, resolve }) => {
    const cookies = event.cookies
    let token = cookies.get('token')
    let refreshToken = cookies.get('refreshToken')

    //? Logica para refrescar el token si es necesario
    if (refreshToken && !token) {
        const user = await UserUtils.verifyToken(refreshToken)
        if (user) {
            const [token_generated, refresh_token_generated] = UserUtils.generateTokens(user)
            token = token_generated
            refreshToken = refresh_token_generated
            if (token_generated && refresh_token_generated) {
                cookies.set('token', token_generated, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24,
                    path: '/',
                })
                cookies.set('refreshToken', refresh_token_generated, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24 * 7,
                    path: '/',
                })
            }
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
            permisos: await UserUtils.get_user_permissions(user),
        }
    }

    return resolve(event)
}
