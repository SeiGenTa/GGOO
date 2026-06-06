import { fail, redirect, type Actions } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { prisma } from '$utils/prisma.js'
import type { Pichanga } from '$generated/prisma/client.js'
import { Permissions } from '$lib/permissions.js'
import logger from '$lib/logger'

export const load: PageServerLoad = async ({ url, depends, locals }) => {
    depends('pichangas:load')
    if (!locals.user!.permisos.includes(Permissions.VerPartidos)) {
        redirect(302, '/app?error=No tienes permisos para ver esta página')
    }
    const page = url.searchParams.get('page')
    if (!page) {
        redirect(302, `/app/pichangas?page=1`)
    }

    return {
        name_page: 'Pichangas',
        gestores: prisma.user
            .findMany({
                where: {
                    OR: [
                        {
                            roles: {
                                some: {
                                    permisos: {
                                        has: Permissions.AdministrarPichanga.toString(),
                                    },
                                },
                            },
                        },
                        {
                            permisos: {
                                has: Permissions.AdministrarPichanga.toString(),
                            },
                        },
                        {
                            es_admin: true,
                        },
                    ],
                },
                select: {
                    id: true,
                    nombre: true,
                    apodo: true,
                },
            })
            .then((gestores) =>
                gestores.map((g) => ({
                    value: g.id,
                    label: `${g.nombre} ${g.apodo ? `(${g.apodo})` : ''}`,
                }))
            ),
        future: {
            pichangas: load_pichangas_promise(page),
        },
    }
}

const load_pichangas_promise = async (page: string) => {
    const data_pichangas = await prisma.pichanga.findMany({
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

        if (!locals.user!.permisos.includes(Permissions.CrearPartidos)) {
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
            date_init_register = form.get('date-init-register')
                ? new Date(form.get('date-init-register') as string)
                : null
        }

        if (!(date_init_register instanceof Date)) {
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

        const datePichanga = new Date(date as string)
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
                    fecha: new Date(date as string),
                    admins: {
                        connect: (admins as string[]).map((admin) => ({
                            id: admin,
                        })),
                    },
                    maxJugadores: parseInt(max_players as string),
                    fechaInicioIncripcion: date_init_register as Date,
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
