import type { Actions } from '@sveltejs/kit'
import { prisma } from '$utils/prisma'
import type { PageServerLoad } from './$types'
import UserUtils from '$utils/user'
import { fail, redirect } from '@sveltejs/kit'
import logger from '$lib/logger'

const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const load: PageServerLoad = async ({}) => {}

export const actions = {
    login: async ({ request, cookies, getClientAddress }) => {
        const formData = await request.formData()
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (!email || !password) {
            return fail(400, {
                success: false,
                message: 'El email y la contraseña son requeridos',
            })
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        })

        if (!user) {
            return fail(400, {
                success: false,
                message: 'Usuario no encontrado',
            })
        }

        const isPasswordValid = UserUtils.verifyPassword(
            password,
            user.password
        )

        if (!isPasswordValid) {
            return fail(400, {
                success: false,
                message: 'Contraseña incorrecta',
            })
        }

        if (!user.es_valido) {
            return fail(400, {
                success: false,
                message:
                    'Debes validar tu cuenta en tu correo electrónico antes de iniciar sesión',
            })
        }

        if (!user.aprobado_por_admin) {
            return fail(400, {
                success: false,
                message:
                    'Tu cuenta está pendiente de aprobación por un administrador. Por favor, espera a que un administrador revise tu cuenta.',
            })
        }

        const ip = getClientAddress()
        const userAgent = request.headers.get('user-agent')
        const { accessToken: token, refreshToken } =
            await UserUtils.generateTokens(user, ip, userAgent)

        cookies.set('token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
        })
        cookies.set('refreshToken', refreshToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS, // 7 days
        })

        logger.info({ action: 'login', email: user.email })

        return {
            success: true,
        }
    },
    logout: async ({ cookies, locals, request, getClientAddress }) => {
        const user = locals.user
        const refreshToken = cookies.get('refreshToken')
        if (refreshToken) {
            await UserUtils.revokeRefreshToken(refreshToken, 'logout')
        }
        cookies.delete('token', { path: '/' })
        cookies.delete('refreshToken', { path: '/' })
        logger.info(
            {
                action: 'logout',
                email: user?.email,
                ip: getClientAddress(),
                userAgent: request.headers.get('user-agent'),
            },
            'Logout de usuario'
        )
        return redirect(302, '/auth')
    },
} satisfies Actions
