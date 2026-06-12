import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { prisma } from '$utils/prisma'
import { Permissions } from '../../../lib/permissions'
import { PERMISSION_BITS, userCan } from '$lib/server/permissions'
import type { Prisma } from '$generated/prisma/client'
import { sendEmail } from '$lib/email/resend'
import { encript_json, encript_string } from '$utils/encript'
import type DataEncripted from '$src/routes/auth/change_name/type'
import { ActionsDataEncripted } from '$src/routes/auth/change_name/type'
import logger from '$lib/logger'

const ALL_PERMISSIONS = Object.values(Permissions)
const PAGE_SIZE = 10

type UserPermissions = {
    isAdmin: boolean
    permissions: Set<string>
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

const parsePage = (value: string | null): number => {
    const page = Number(value)
    if (!Number.isFinite(page) || page < 1) {
        return 1
    }

    return Math.floor(page)
}

const parseStatus = (value: string | null): FilterStatus => {
    if (value === 'pending' || value === 'approved' || value === 'rejected') {
        return value
    }

    return 'all'
}

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        redirect(302, '/auth')
    }

    if (!userCan(locals.user, PERMISSION_BITS[Permissions.VerMiembros])) {
        redirect(
            302,
            '/app?error=No tienes permisos para acceder a esta página.'
        )
    }

    const q = (url.searchParams.get('q') ?? '').trim()
    const status = parseStatus(url.searchParams.get('status'))
    const requestedPage = parsePage(url.searchParams.get('page'))

    const where: Prisma.UserWhereInput = {}

    if (q.length > 0) {
        where.OR = [
            { id: { contains: q, mode: 'insensitive' } },
            { nombre: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { apodo: { contains: q, mode: 'insensitive' } },
        ]
    }

    if (status === 'pending') {
        where.AND = [
            { aprobado_por_admin: false },
            { rechazado_por_admin: false },
        ]
    }

    if (status === 'approved') {
        where.aprobado_por_admin = true
    }

    if (status === 'rejected') {
        where.rechazado_por_admin = true
    }

    const totalUsers = await prisma.user.count({ where })
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))
    const page = Math.min(requestedPage, totalPages)
    const skip = (page - 1) * PAGE_SIZE

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            nombre: true,
            email: true,
            apodo: true,
            es_valido: true,
            aprobado_por_admin: true,
            rechazado_por_admin: true,
            roles: {
                select: {
                    id: true,
                    nombre: true,
                },
                orderBy: {
                    nombre: 'asc',
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip,
        take: PAGE_SIZE,
    })

    const canModerate = userCan(
        locals.user,
        PERMISSION_BITS[Permissions.AceptarMiembros]
    )

    return {
        name_page: 'Usuarios',
        users,
        blocked: false,
        canModerate,
        filters: {
            q,
            status,
        },
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            totalItems: totalUsers,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
    }
}

export const actions: Actions = {
    accept_member: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_accept_member_unauthorized' },
                'Intento de aprobar miembro sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_accept_member_forbidden',
                    userId: locals.user.id,
                },
                'Intento de aprobar miembro sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para aceptar miembros.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                aprobado_por_admin: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        if (user.aprobado_por_admin) {
            return {
                success: true,
                message: 'El usuario ya estaba aprobado.',
            }
        }

        const defaultRole = await prisma.rol.findFirst({
            where: {
                is_default: true,
            },
        })

        await prisma.user.update({
            where: { id: userId },
            data: {
                es_valido: true,
                aprobado_por_admin: true,
                rechazado_por_admin: false,
                roles: defaultRole
                    ? {
                          connect: {
                              id: defaultRole.id,
                          },
                      }
                    : undefined,
            },
        })

        const userEmail = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        })

        const subject = 'Cuenta aprobada en GGOO'

        const html = `
            <p>¡Hola!</p>
            <p>Nos complace informarte que tu cuenta en GGOO ha sido aprobada por un administrador. Ahora puedes iniciar sesión y comenzar a disfrutar de todas las funcionalidades de la plataforma.</p>
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            <p>¡Bienvenido a GGOO!</p>
        `

        if (userEmail?.email) {
            await sendEmail(userEmail.email, subject, html)
        }

        return {
            success: true,
            message: 'Usuario aprobado correctamente.',
        }
    },

    reject_member: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_reject_member_unauthorized' },
                'Intento de rechazar miembro sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_reject_member_forbidden',
                    userId: locals.user.id,
                },
                'Intento de rechazar miembro sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para rechazar miembros.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()
        const comment = (form.get('comment') as string | null)?.trim() ?? ''

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                rechazado_por_admin: true,
                aprobado_por_admin: false,
                es_valido: false,
            },
        })

        //! Enviar correo para cambiar el nombre
        await sendEmailNameRechazed(user.email, comment, user.id)

        return {
            success: true,
            message:
                comment.length > 0
                    ? 'Usuario rechazado. Comentario registrado temporalmente.'
                    : 'Usuario rechazado correctamente.',
        }
    },

    send_email_confirmation: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_send_email_confirmation_unauthorized' },
                'Intento de reenviar correo de confirmación sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_send_email_confirmation_forbidden',
                    userId: locals.user.id,
                },
                'Intento de reenviar correo de confirmación sin permisos'
            )
            return fail(403, {
                message:
                    'No tienes permisos para reenviar el correo de confirmación.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                es_valido: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        if (user.es_valido) {
            return fail(400, {
                message:
                    'La cuenta ya está validada. No es necesario reenviar el correo.',
            })
        }

        await sendEmailConfirmation(user.email)

        logger.info(
            {
                action: 'action_send_email_confirmation_success',
                actorId: locals.user.id,
                targetId: user.id,
            },
            'Correo de confirmación reenviado'
        )

        return {
            success: true,
            message: 'Correo de confirmación enviado correctamente.',
        }
    },

    send_password_change: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_send_password_change_unauthorized' },
                'Intento de enviar correo de cambio de contraseña sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_send_password_change_forbidden',
                    userId: locals.user.id,
                },
                'Intento de enviar correo de cambio de contraseña sin permisos'
            )
            return fail(403, {
                message:
                    'No tienes permisos para enviar el correo de cambio de contraseña.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                password: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        await sendEmailPasswordChange(user.email, user.password)

        logger.info(
            {
                action: 'action_send_password_change_success',
                actorId: locals.user.id,
                targetId: user.id,
            },
            'Correo de cambio de contraseña enviado'
        )

        return {
            success: true,
            message:
                'Correo de recuperación de contraseña enviado correctamente.',
        }
    },

    block_account: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_block_account_unauthorized' },
                'Intento de bloquear cuenta sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_block_account_forbidden',
                    userId: locals.user.id,
                },
                'Intento de bloquear cuenta sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para bloquear cuentas.',
            })
        }

        if (!locals.user.es_admin) {
            logger.info(
                {
                    action: 'action_block_account_forbidden_non_admin',
                    userId: locals.user.id,
                },
                'Intento de bloquear cuenta por un usuario no administrador'
            )
            return fail(403, {
                message: 'Solo los administradores pueden bloquear cuentas.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()
        const comment = (form.get('comment') as string | null)?.trim() ?? ''

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        if (userId === locals.user.id) {
            return fail(400, {
                message: 'No puedes bloquear tu propia cuenta.',
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                es_admin: true,
                rechazado_por_admin: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        if (user.es_admin) {
            return fail(400, {
                message: 'No se puede bloquear a otro administrador.',
            })
        }

        if (user.rechazado_por_admin) {
            return {
                success: true,
                message: 'La cuenta ya se encontraba bloqueada.',
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                rechazado_por_admin: true,
                aprobado_por_admin: false,
                es_valido: false,
            },
        })

        await sendEmailAccountBlocked(user.email, comment)

        logger.info(
            {
                action: 'action_block_account_success',
                actorId: locals.user.id,
                targetId: user.id,
            },
            'Cuenta bloqueada por administrador'
        )

        return {
            success: true,
            message: 'Cuenta bloqueada y notificación enviada al usuario.',
        }
    },

    activate_account: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_activate_account_unauthorized' },
                'Intento de activar cuenta sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_activate_account_forbidden',
                    userId: locals.user.id,
                },
                'Intento de activar cuenta sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para activar cuentas.',
            })
        }

        if (!locals.user.es_admin) {
            logger.info(
                {
                    action: 'action_activate_account_forbidden_non_admin',
                    userId: locals.user.id,
                },
                'Intento de activar cuenta por un usuario no administrador'
            )
            return fail(403, {
                message: 'Solo los administradores pueden activar cuentas.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                aprobado_por_admin: true,
                rechazado_por_admin: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        if (!user.rechazado_por_admin) {
            return {
                success: true,
                message: 'La cuenta ya estaba activa.',
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                rechazado_por_admin: false,
                aprobado_por_admin: true,
                es_valido: true,
            },
        })

        await sendEmailAccountActivated(user.email)

        logger.info(
            {
                action: 'action_activate_account_success',
                actorId: locals.user.id,
                targetId: user.id,
            },
            'Cuenta reactivada por administrador'
        )

        return {
            success: true,
            message: 'Cuenta reactivada correctamente.',
        }
    },

    delete_account: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_delete_account_unauthorized' },
                'Intento de eliminar cuenta sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.BorrarMiembros])) {
            logger.info(
                {
                    action: 'action_delete_account_forbidden',
                    userId: locals.user.id,
                },
                'Intento de eliminar cuenta sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para eliminar cuentas.',
            })
        }

        if (!locals.user.es_admin) {
            logger.info(
                {
                    action: 'action_delete_account_forbidden_non_admin',
                    userId: locals.user.id,
                },
                'Intento de eliminar cuenta por un usuario no administrador'
            )
            return fail(403, {
                message: 'Solo los administradores pueden eliminar cuentas.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        if (userId === locals.user.id) {
            return fail(400, {
                message: 'No puedes eliminar tu propia cuenta.',
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                es_admin: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        if (user.es_admin) {
            return fail(400, {
                message: 'No se puede eliminar a otro administrador.',
            })
        }

        await prisma.user.delete({
            where: { id: userId },
        })

        logger.warn(
            {
                action: 'action_delete_account_success',
                actorId: locals.user.id,
                targetId: userId,
            },
            'Cuenta eliminada por administrador'
        )

        return {
            success: true,
            message: 'Cuenta eliminada permanentemente.',
        }
    },

    reject_name: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_reject_name_unauthorized' },
                'Intento de rechazar nombre sin autenticación'
            )
            return fail(401, { message: 'No autorizado.' })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.AceptarMiembros])) {
            logger.info(
                {
                    action: 'action_reject_name_forbidden',
                    userId: locals.user.id,
                },
                'Intento de rechazar nombre sin permisos'
            )
            return fail(403, {
                message: 'No tienes permisos para rechazar el nombre.',
            })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()
        const comment = (form.get('comment') as string | null)?.trim() ?? ''

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
            },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                rechazado_por_admin: true,
                aprobado_por_admin: false,
                es_valido: false,
            },
        })

        await sendEmailNameRechazed(user.email, comment, user.id)

        logger.info(
            {
                action: 'action_reject_name_success',
                actorId: locals.user.id,
                targetId: user.id,
            },
            'Nombre rechazado y correo de reenvío enviado'
        )

        return {
            success: true,
            message:
                'Nombre rechazado. Se envió un correo para que el usuario lo actualice.',
        }
    },
}

const sendEmailNameRechazed = async (
    to: string,
    comment: string,
    userId: string
) => {
    const subject = 'Nombre rechazado'
    const dataChangeName: DataEncripted = {
        action: ActionsDataEncripted.ChangeName,
        id: userId,
        max_age: 60 * 60 * 1000 * 24 * 7, // 7 días para cambiar el nombre
    }
    const dataChangeNameEncripted = encript_json(dataChangeName)
    const urlRedirect = `${process.env.ORIGIN ?? 'http://localhost:5173/'}auth/change_name?data=${encodeURIComponent(dataChangeNameEncripted)}`

    const html = `
    <p>Hola,</p>
	<p> Su nombre a sido rechazado, este debe tener la siguiente estructura <p>
	<p> NOMBRE APELLIDO ej: Juan Alberto </p>
	<p> Para cambiar su nombre debe acceeder al siguiente enlace </p>
	<a href="${urlRedirect}"> Cambiar Nombre </a>
	<p> Si no puede acceder copie este enlace </p>
	<p>${urlRedirect}</p>

	<p>COMENTARIO</p>
	<p>${comment}</p>
  `

    await sendEmail(to, subject, html)
}

const RECOVER_REASON = 'recover_password'
const RECOVER_TTL_MS = 60 * 60 * 1000

type RecoverPayload = {
    action: typeof RECOVER_REASON
    email: string
    password: string
    max_age: number
}

const sendEmailPasswordChange = async (to: string, password: string) => {
    const subject = 'Recuperación de contraseña'
    const payload: RecoverPayload = {
        action: RECOVER_REASON,
        email: to,
        password,
        max_age: Date.now() + RECOVER_TTL_MS,
    }
    const token = encript_json(payload)
    const origin = process.env.ORIGIN ?? 'http://localhost:5173/'
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
    const resetUrl = `${normalizedOrigin}/auth/recover/change_password?token=${encodeURIComponent(token)}`

    const html = `
        <p>Hola,</p>
        <p>Un administrador ha solicitado el envío de un enlace para que puedas cambiar tu contraseña en GGOO.</p>
        <p>Para cambiar tu clave, accede al siguiente enlace:</p>
        <a href="${resetUrl}">Cambiar contraseña</a>
        <p>Si no puedes acceder, copia y pega este enlace en tu navegador:</p>
        <p>${resetUrl}</p>
        <p>Este enlace expira en 1 hora.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
    `

    await sendEmail(to, subject, html)
}

const sendEmailConfirmation = async (to: string) => {
    const validationKey = encript_string(to)
    const origin = process.env.ORIGIN ?? 'http://localhost:5173/'
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
    const verifyUrl = `${normalizedOrigin}/auth/verify?code=${validationKey}`

    const subject = 'Confirma tu correo en GGOO'
    const html = `
        <p>Hola ${to},</p>
        <h1>Confirma tu correo en GGOO</h1>
        <p>Un administrador ha reenviado el correo de confirmación de tu cuenta.</p>
        <p>Para validar tu cuenta, haz clic en el siguiente enlace:</p>
        <a href="${verifyUrl}">Validar cuenta</a>
        <p>Si no puedes acceder, copia y pega este enlace en tu navegador:</p>
        <p>${verifyUrl}</p>
        <p>Una vez validada tu cuenta, un administrador deberá aprobar tu ingreso.</p>
    `

    await sendEmail(to, subject, html)
}

const sendEmailAccountBlocked = async (to: string, comment: string) => {
    const subject = 'Tu cuenta en GGOO ha sido bloqueada'
    const html = `
        <p>Hola,</p>
        <p>Te informamos que tu cuenta en GGOO ha sido bloqueada por un administrador y no podrá ser utilizada hasta nuevo aviso.</p>
        <p>Si consideras que se trata de un error, por favor contacta al equipo de administración.</p>
        ${comment.length > 0 ? `<p><strong>Comentario del administrador:</strong></p><p>${comment}</p>` : ''}
    `

    await sendEmail(to, subject, html)
}

const sendEmailAccountActivated = async (to: string) => {
    const subject = 'Tu cuenta en GGOO ha sido reactivada'
    const html = `
        <p>Hola,</p>
        <p>Nos complace informarte que tu cuenta en GGOO ha sido reactivada por un administrador. Ya puedes iniciar sesión y volver a utilizar la plataforma.</p>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p>¡Bienvenido de vuelta a GGOO!</p>
    `

    await sendEmail(to, subject, html)
}
