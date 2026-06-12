import { fail, redirect, type Actions } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { prisma } from '$utils/prisma.js'
import type { Pichanga } from '$generated/prisma/client.js'
import { Permissions } from '$lib/permissions.js'
import { PERMISSION_BITS, userCan } from '$lib/server/permissions'
import logger from '$lib/logger'
import { schedulePichangaOpen } from '$lib/server/pichanga-stream'
import { loadGestores } from '$lib/server/gestores'
import { isUTCISO, parseUTCDate } from '$lib/datetime'

export const load: PageServerLoad = async ({ url, depends, locals }) => {
    depends('pichangas:load')
    if (!userCan(locals.user, PERMISSION_BITS[Permissions.VerPartidos])) {
        redirect(302, '/app?error=No tienes permisos para ver esta página')
    }
    const page = url.searchParams.get('page')
    if (!page) {
        redirect(302, `/app/pichangas?page=1`)
    }

    const canManagePartidos = userCan(
        locals.user,
        PERMISSION_BITS[Permissions.CrearPartidos] |
            PERMISSION_BITS[Permissions.EditarPartidos]
    )

    const gestores = await loadGestores()

    return {
        name_page: 'Pichangas',
        canManagePartidos,
        gestores,
        future: {
            pichangas: load_pichangas_promise(page, canManagePartidos),
        },
    }
}

const load_pichangas_promise = async (
    page: string,
    canManagePartidos: boolean
) => {
    const now = new Date()
    const where = canManagePartidos
        ? undefined
        : { fechaInicioIncripcion: { lte: now } }

    const data_pichangas = await prisma.pichanga.findMany({
        where,
        include: {
            admins: true,
            inscripciones: {
                where: {
                    tiempoSalidaLista: null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            },
        },
        orderBy: {
            fecha: 'desc',
        },
        skip: (parseInt(page) - 1) * 10,
        take: 10,
    })

    for (const p of data_pichangas) {
        if (p.fechaInicioIncripcion && p.fechaInicioIncripcion > now) {
            schedulePichangaOpen(p.id, p.fechaInicioIncripcion)
        }
    }

    const pichangas: Pichanga_struct[] = [
        ...data_pichangas.map((pichanga) => ({
            id: pichanga.id,
            name: pichanga.nombre?.toString() || null,
            admins_name: pichanga.admins.map((admin) => admin.nombre),
            date: pichanga.fecha.toISOString(),
            fechaInicioIncripcion:
                pichanga.fechaInicioIncripcion?.toISOString() ??
                new Date(0).toISOString(),
            limit_members: pichanga.maxJugadores,
            members: pichanga.inscripciones.map((inscripcion) => ({
                id: inscripcion.user.id,
                name: inscripcion.user.nombre,
            })),
        })),
    ]
    return pichangas
}

export const actions = {
    add_pichanga: async ({ request, locals }) => {
        if (!locals.user) {
            logger.info(
                { action: 'action_add_pichanga_unauthorized' },
                'Intento de crear pichanga sin autenticación'
            )
            return fail(401, {
                error: 'No autorizado',
            })
        }

        if (!userCan(locals.user, PERMISSION_BITS[Permissions.CrearPartidos])) {
            logger.info(
                {
                    action: 'action_add_pichanga_forbidden',
                    userId: locals.user.id,
                },
                'Intento de crear pichanga sin permisos'
            )
            return fail(403, {
                error: 'No tienes permisos para crear una pichanga',
            })
        }
        const form = await request.formData()
        const name = form.get('name-pichanga')
        const date = form.get('date-pichanga')
        const location = form.get('location')
        const admins = form.getAll('admins')
        const max_players = form.get('max_players')
        const habilitar = form.get('habilitar')
        let date_init_register: Date | null = null
        if (habilitar) {
            date_init_register = new Date()
        } else {
            const dateInitRaw = form.get('date-init-register')?.toString()
            if (dateInitRaw) {
                if (!isUTCISO(dateInitRaw)) {
                    return fail(400, {
                        error: 'La fecha de inicio de registro debe venir en formato UTC (ISO 8601 con Z u offset)',
                    })
                }
                date_init_register = parseUTCDate(dateInitRaw)
            }
        }

        if (!date_init_register) {
            return fail(400, {
                error: 'La fecha de inicio de registro es requerida si no se habilita el registro inmediato',
            })
        }

        if (
            !date ||
            !admins ||
            admins.length === 0 ||
            !max_players ||
            !date_init_register
        ) {
            return fail(400, {
                error: `Los siguiente campos son requeridos:
                        ${!date ? 'Fecha' : ''}
                        ${!admins || admins.length === 0 ? 'Admins' : ''}
                        ${!max_players ? 'Maximo de jugadores' : ''}
                        ${habilitar ? 'Fecha de inicio de registro' : ''}
                    `,
            })
        }

        const dateStr = date.toString()
        if (!isUTCISO(dateStr)) {
            return fail(400, {
                error: 'La fecha de la pichanga debe venir en formato UTC (ISO 8601 con Z u offset)',
            })
        }
        const datePichanga = parseUTCDate(dateStr)
        if (!datePichanga) {
            return fail(400, { error: 'La fecha de la pichanga no es válida' })
        }
        if (datePichanga < new Date()) {
            return fail(400, {
                error: 'La fecha de la pichanga debe ser en el futuro',
            })
        }
        if (date_init_register && datePichanga < date_init_register) {
            return fail(400, {
                error: 'La fecha de inicio de registro debe ser antes de la fecha de la pichanga',
            })
        }
        let pichanga: Pichanga | null = null
        try {
            pichanga = await prisma.pichanga.create({
                data: {
                    nombre: (name as string) || undefined,
                    lugar: (location as string) || undefined,
                    fecha: datePichanga,
                    admins: {
                        connect: (admins as string[]).map((admin) => ({
                            id: admin,
                        })),
                    },
                    maxJugadores: parseInt(max_players as string),
                    fechaInicioIncripcion: date_init_register,
                },
            })
        } catch (error) {
            logger.error('Error al crear la pichanga')
            return fail(500, { error: 'Error al crear la pichanga' })
        }

        logger.info(
            `Pichanga ${pichanga.id} creada por el usuario ${locals.user!.id}`
        )

        return {
            success: true,
            message: `Pichanga ${name} creada exitosamente con la id ${pichanga.id}`,
        }
    },
} satisfies Actions
