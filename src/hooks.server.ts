import logger from '$lib/logger'
import UserUtils from '$utils/user'
import type { Handle } from '@sveltejs/kit'

const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const handle: Handle = async ({ event, resolve }) => {
    const cookies = event.cookies
    let token = cookies.get('token')
    let refreshToken = cookies.get('refreshToken')
    let user = null

    if (token) {
        user = await UserUtils.verifyToken(token)
    }

    if (!user && refreshToken) {
        const ip = event.getClientAddress()
        const userAgent = event.request.headers.get('user-agent')
        const newTokens = await UserUtils.rotateRefreshToken(
            refreshToken,
            ip,
            userAgent
        )

        if (newTokens) {
            token = newTokens.accessToken
            refreshToken = newTokens.refreshToken

            cookies.set('token', token, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60,
            })
            cookies.set('refreshToken', refreshToken, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
            })

            user = await UserUtils.verifyToken(token)
        } else {
            cookies.delete('token', { path: '/' })
            cookies.delete('refreshToken', { path: '/' })
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
