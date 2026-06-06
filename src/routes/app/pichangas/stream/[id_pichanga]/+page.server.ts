import { prisma } from '$utils/prisma'
import { fail, redirect } from '@sveltejs/kit'
import { publishPichangaUpdate } from '$lib/server/pichanga-stream'
import type { Actions, PageServerLoad } from './$types'
import { Permissions } from '$lib/permissions'
import logger from '$lib/logger'

const getPichangaWindow = async (id_pichanga: string) => {
    return prisma.pichanga.findUnique({
        where: {
            id: id_pichanga,
        },
        select: {
            fecha: true,
            fechaInicioIncripcion: true,
            admins: {
                select: {
                    id: true,
                },
            },
        },
    })
}

export const load: PageServerLoad = async ({ params }) => {
    const { id_pichanga } = params

    const pichanga_data = await prisma.pichanga.findUnique({
        where: {
            id: id_pichanga,
        },
        select: {
            id: true,
            nombre: true,
            lugar: true,
            fecha: true,
            fechaInicioIncripcion: true,
            admins: {
                select: {
                    id: true,
                    nombre: true,
                },
            },
            inscripciones: {
                select: {
                    id: true,
                    createdAt: true,
                    tiempoSalidaLista: true,
                    posicionEnLista: true,
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                            apodo: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            },
            maxJugadores: true,
        },
    })

    if (!pichanga_data) {
        throw new Error('Pichanga no encontrada')
    }

    return {
        name_page: 'Lista en tiempo real',
        pichanga: pichanga_data,
    }
}

export const actions = {
    editar: async ({ params, request, locals }) => {
        const { id_pichanga } = params
        const form = await request.formData()
        const name = form.get('name-pichanga')
        const date = form.get('date-pichanga')
        const location = form.get('location')
        const admins = form.getAll('admins')
        const max_players = form.get('max_players')
        const habilitar = form.get('habilitar')
        const date_init_register_input = form.get('date-init-register')

        let date_init_register: Date | null = null
        if (habilitar === 'on') {
            date_init_register = new Date()
        } else if (date_init_register_input) {
            date_init_register = new Date(date_init_register_input.toString())
        }

        if (
            !date ||
            !admins ||
            admins.length === 0 ||
            !max_players ||
            !date_init_register
        ) {
            return fail(400, {
                error: 'Todos los campos son requeridos, incluyendo al menos un admin y la fecha de inicio de registro',
            })
        }
        if (!locals.user) {
            logger.info(
                { action: 'action_edit_pichanga_unauthorized' },
                'Intento de editar pichanga sin autenticación'
            )
            return fail(401, { error: 'Usuario no autenticado' })
        }

        if (!locals.user.permisos.includes(Permissions.EditarPartidos)) {
            logger.info(
                {
                    action: 'action_edit_pichanga_forbidden',
                    userId: locals.user.id,
                    pichangaId: id_pichanga,
                },
                'Intento de editar pichanga sin permisos'
            )
            redirect(
                302,
                '/app?error=No tienes permisos para editar esta pichanga.'
            )
        }

        await prisma.pichanga.update({
            where: {
                id: id_pichanga,
            },
            data: {
                nombre: name?.toString() || undefined,
                fecha: new Date(date.toString()),
                lugar: location?.toString() || undefined,
                maxJugadores: parseInt(max_players.toString()),
                fechaInicioIncripcion: date_init_register,
                admins: {
                    set: (admins as string[]).map((admin) => ({ id: admin })),
                },
            },
        })

        logger.info(
            {
                accion: 'editar',
                usuarioId: locals.user.id,
                pichangaId: id_pichanga,
                new_status: {
                    nombre: name?.toString() || null,
                    fecha: new Date(date.toString()).toISOString(),
                    lugar: location?.toString() || null,
                    maxJugadores: parseInt(max_players.toString()),
                    fechaInicioIncripcion: date_init_register
                        ? date_init_register.toISOString()
                        : null,
                    admins: (admins as string[]).map((admin) => ({
                        id: admin,
                    })),
                },
            },
            `Usuario ${locals.user.id} editó la pichanga ${id_pichanga}`
        )

        publishPichangaUpdate(id_pichanga, 'edited')
    },
    inscribirse: async ({ params, locals }) => {
        const { id_pichanga } = params
        const { user } = locals

        if (!user) {
            return fail(401, { error: 'Usuario no autenticado' })
        }

        const pichanga = await getPichangaWindow(id_pichanga)

        if (!pichanga) {
            return fail(404, { error: 'Pichanga no encontrada' })
        }

        if (pichanga.admins.some((admin) => admin.id === user.id)) {
            return fail(403, {
                error: 'Los administradores no pueden inscribirse en esta pichanga',
            })
        }

        const now = new Date()
        if (
            !pichanga.fechaInicioIncripcion ||
            now < pichanga.fechaInicioIncripcion ||
            now >= pichanga.fecha
        ) {
            return fail(400, {
                error: 'Las acciones solo están habilitadas entre el inicio de inscripción y el inicio del evento',
            })
        }

        const existingInscription = await prisma.inscripcion.findFirst({
            where: {
                pichangaId: id_pichanga,
                userId: user.id,
                tiempoSalidaLista: null,
            },
        })

        if (existingInscription) {
            return fail(400, { error: 'Ya estás inscrito en esta pichanga' })
        }

        await prisma.inscripcion.create({
            data: {
                pichangaId: id_pichanga,
                userId: user.id,
            },
        })

        logger.info(
            {
                accion: 'inscripcion',
                usuarioId: user.id,
                pichangaId: id_pichanga,
            },
            `Usuario ${user.id} se inscribió en la pichanga ${id_pichanga}`
        )

        publishPichangaUpdate(id_pichanga, 'joined')
    },
    salir: async ({ params, locals }) => {
        const { id_pichanga } = params
        const { user } = locals

        if (!user) {
            return fail(401, { error: 'Usuario no autenticado' })
        }

        const pichanga = await getPichangaWindow(id_pichanga)

        if (!pichanga) {
            return fail(404, { error: 'Pichanga no encontrada' })
        }

        if (pichanga.admins.some((admin) => admin.id === user.id)) {
            return fail(403, {
                error: 'Los administradores no pueden salir de esta pichanga',
            })
        }

        const now = new Date()
        if (
            !pichanga.fechaInicioIncripcion ||
            now < pichanga.fechaInicioIncripcion ||
            now >= pichanga.fecha
        ) {
            return fail(400, {
                error: 'Las acciones solo están habilitadas entre el inicio de inscripción y el inicio del evento',
            })
        }

        const activeInscription = await prisma.inscripcion.findFirst({
            where: {
                pichangaId: id_pichanga,
                userId: user.id,
                tiempoSalidaLista: null,
            },
            select: {
                id: true,
                createdAt: true,
            },
        })

        if (!activeInscription) {
            return fail(400, { error: 'No estás inscrito en esta pichanga' })
        }

        const posicionEnLista = await prisma.inscripcion.count({
            where: {
                pichangaId: id_pichanga,
                tiempoSalidaLista: null,
                OR: [
                    {
                        createdAt: {
                            lt: activeInscription.createdAt,
                        },
                    },
                    {
                        createdAt: activeInscription.createdAt,
                        id: {
                            lte: activeInscription.id,
                        },
                    },
                ],
            },
        })

        const cantidadEnLista = await prisma.inscripcion.count({
            where: {
                pichangaId: id_pichanga,
                tiempoSalidaLista: null,
            },
        })

        await prisma.inscripcion.update({
            where: {
                id: activeInscription.id,
            },
            data: {
                tiempoSalidaLista: new Date(),
                posicionEnLista,
            },
        })

        logger.info(
            {
                accion: 'salir',
                usuarioId: user.id,
                pichangaId: id_pichanga,
                posicionEnLista,
                cantidadEnLista,
            },
            `Usuario ${user.id} salió de la pichanga ${id_pichanga}`
        )
        publishPichangaUpdate(id_pichanga, 'left')
    },
    eliminar: async ({ params, locals }) => {
        const { id_pichanga } = params
        const { user } = locals

        if (!user) {
            logger.info(
                { action: 'action_delete_pichanga_unauthorized' },
                'Intento de eliminar pichanga sin autenticación'
            )
            return fail(401, { error: 'Usuario no autenticado' })
        }

        if (user.permisos.includes(Permissions.EditarPartidos)) {
            logger.info(
                {
                    action: 'action_delete_pichanga_forbidden',
                    userId: user.id,
                    pichangaId: id_pichanga,
                },
                'Intento de eliminar pichanga sin permisos'
            )
            redirect(
                302,
                '/app?error=No tienes permisos para eliminar esta pichanga.'
            )
        }

        const pichanga = await prisma.pichanga.findUnique({
            where: {
                id: id_pichanga,
            },
            select: {
                admins: {
                    select: {
                        id: true,
                    },
                },
            },
        })

        if (!pichanga) {
            return fail(404, { error: 'Pichanga no encontrada' })
        }

        await prisma.pichanga.delete({
            where: {
                id: id_pichanga,
            },
        })

        logger.info(
            {
                accion: 'eliminar',
                usuarioId: user.id,
                pichangaId: id_pichanga,
            },
            `Usuario ${user.id} eliminó la pichanga ${id_pichanga}`
        )

        publishPichangaUpdate(id_pichanga, 'deleted')

        redirect(302, '/app?success=Pichanga eliminada correctamente.')
    },
} satisfies Actions
