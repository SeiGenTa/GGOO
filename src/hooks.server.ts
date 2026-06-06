import logger from '$lib/logger'
import UserUtils from '$utils/user'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
    const cookies = event.cookies
    let token = cookies.get('token')
    let refreshToken = cookies.get('refreshToken')
    let user = null

    if (token) {
        user = await UserUtils.verifyToken(token)
    }

    if (!user && refreshToken) {
        cookies.delete('token', { path: '/' })
        cookies.delete('refreshToken', { path: '/' })

        const newTokens =
            await UserUtils.generateNewTokensFromRefreshToken(refreshToken)

        if (newTokens) {
            token = newTokens.token
            refreshToken = newTokens.refreshToken

            cookies.set('token', token, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            })
            cookies.set('refreshToken', refreshToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            })

            user = await UserUtils.verifyToken(token)
        } else {
            token = undefined
            refreshToken = undefined
        }
    }

    if (user) {
        event.locals.user = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apodo: user.apodo,
            es_admin: user.es_admin,
            permisos: user.permisos,
            posiciones: user.posiciones,
            cumpleanos: user.cumpleanos,
        }
    } else {
        event.locals.user = null
    }

    try {
        return await resolve(event)
    } catch (err) {
        logger.info(
            `Error en handle: ${err instanceof Error ? err.message : String(err)}`
        )
        throw err
    }
}
