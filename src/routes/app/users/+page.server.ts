import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { prisma } from '$utils/prisma'
import { Permissions } from '../../../lib/permissions'
import type { Prisma } from '$generated/prisma/client'
import { sendEmail } from '$lib/email/resend'
import { encript_json } from '$utils/encript'
import type DataEncripted from '$src/routes/auth/change_name/type'
import { ActionsDataEncripted } from '$src/routes/auth/change_name/type'

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

    if (!locals.user.permisos.includes(Permissions.VerMiembros)) {
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

    const canModerate = locals.user!.permisos.includes(
        Permissions.AceptarMiembros
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
            return fail(401, { message: 'No autorizado.' })
        }

        if (!locals.user.permisos.includes(Permissions.AceptarMiembros)) {
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
            return fail(401, { message: 'No autorizado.' })
        }

        if (!locals.user.permisos.includes(Permissions.AceptarMiembros)) {
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
		sendEmailNameRechazed(
			user.email,
			comment,
			user.id
		)

        return {
            success: true,
            message:
                comment.length > 0
                    ? 'Usuario rechazado. Comentario registrado temporalmente.'
                    : 'Usuario rechazado correctamente.',
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
		max_age: 60 * 60 * 1000 *24 * 7, // 7 días para cambiar el nombre
    }
    const dataChangeNameEncripted = encript_json(dataChangeName)
    const urlRedirect = `${process.env.URI_DIRECTORY ?? 'http://localhost:5173/'}auth/change_name?data=${encodeURIComponent(dataChangeNameEncripted)}`

    const html = `
    <p>Hola,</p>
	<p> Su nombre a sido rechazado, este debe tener la siguiente estructura <p>
	<p> NOMBRE APELLIDO ej: Juan Alberto </p>
	<p> Para cambiar su nombre debe acceeder al siguiente enlace </p>
	<a href="${urlRedirect}"> Cambiar Nombre </p>
	<p> Si no puede acceder copie este enlace </p>
	<p>${urlRedirect}</p>

	<p>COMENTARIO</p>
	<p>${comment}</p>
  `

    await sendEmail(to, subject, html)
}
