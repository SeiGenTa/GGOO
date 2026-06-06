import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import jwt from 'jsonwebtoken'
import { prisma } from '$utils/prisma'
import UserUtils from '$utils/user'
import logger from '$lib/logger'

type RecoverJwtPayload = {
    email: string
    reason: string
    password: string
    iat?: number
    exp?: number
}

const RECOVER_REASON = 'recover_password'

const getValidPayload = async (token: string) => {
    const secretKey = process.env.SECRET_KEY || 'your_secret_key_here'

    let decoded: RecoverJwtPayload
    try {
        decoded = jwt.verify(token, secretKey) as RecoverJwtPayload
    } catch {
        return null
    }

    if (
        !decoded?.email ||
        decoded.reason !== RECOVER_REASON ||
        !decoded.password
    ) {
        return null
    }

    const user = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: { id: true, email: true, password: true },
    })

    if (!user || user.password !== decoded.password) {
        return null
    }

    return {
        user,
        payload: decoded,
    }
}

export const load: PageServerLoad = async ({ url }) => {
    const token = (url.searchParams.get('token') ?? '').trim()

    if (!token) {
        throw redirect(303, '/auth?error=Token%20de%20recuperacion%20invalido.')
    }

    const validated = await getValidPayload(token)

    if (!validated) {
        throw redirect(
            303,
            '/auth?error=Token%20de%20recuperacion%20invalido%20o%20expirado.'
        )
    }

    return {
        token,
        email: validated.user.email,
    }
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData()
        const token = (formData.get('token') as string | null)?.trim() ?? ''
        const password =
            (formData.get('password') as string | null)?.trim() ?? ''
        const passwordConfirm =
            (formData.get('passwordConfirm') as string | null)?.trim() ?? ''

        if (!token) {
            return fail(400, {
                success: false,
                message: 'Token de recuperacion invalido.',
            })
        }

        if (password.length < 8) {
            return fail(400, {
                success: false,
                message: 'La nueva clave debe tener al menos 8 caracteres.',
            })
        }

        if (password !== passwordConfirm) {
            return fail(400, {
                success: false,
                message: 'Las claves no coinciden.',
            })
        }

        const validated = await getValidPayload(token)

        if (!validated) {
            return fail(400, {
                success: false,
                message: 'El enlace de recuperacion es invalido o expiro.',
            })
        }

        const newPasswordHash = UserUtils.hashPassword(password)
        await prisma.user.update({
            where: { id: validated.user.id },
            data: { password: newPasswordHash },
        })

        logger.info(
            {
                action: 'action_recover_password_changed',
                userId: validated.user.id,
                email: validated.user.email,
            },
            'Clave actualizada desde flujo de recuperacion'
        )

        redirect(303, '/auth?success=Clave%20actualizada%20correctamente.')
    },
} satisfies Actions
