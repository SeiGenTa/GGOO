import UserUtils from '$utils/user'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
    const cookies = event.cookies
    const token = cookies.get('token')
    const refresToken = cookies.get('refreshToken')

    //? Logica para refrescar el token si es necesario
    if (refresToken && !token) {
        console.log('Refrescando token...')
        const user = await UserUtils.verifyToken(refresToken)
        if (user) {
            const [token, refresh_token] = UserUtils.generateTokens(user)
            if (token && refresh_token) {
                cookies.set('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24,
                    path: '/',
                })
                cookies.set('refreshToken', refresh_token, {
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

    const response = await resolve(event)
    return response
}
