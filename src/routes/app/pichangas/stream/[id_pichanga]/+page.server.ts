import { prisma } from '$utils/prisma'
import { error, fail, redirect } from '@sveltejs/kit'
import {
    cancelPichangaOpen,
    publishPichangaUpdate,
    schedulePichangaOpen,
} from '$lib/server/pichanga-stream'
import { loadGestores } from '$lib/server/gestores'
import type { Actions, PageServerLoad } from './$types'
import { Permissions } from '$lib/permissions'
import logger from '$lib/logger'
import { isUTCISO, parseUTCDate } from '$lib/datetime'

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

// Devuelve true si el momento actual está dentro del día de la pichanga en
// horario de Chile (UTC-3/-4 manejado por el runtime vía
// timeZone: 'America/Santiago') y la hora local ya pasó la hora de corte
// indicada (inclusive).
const isAfterHourChileOnMatchDay = (
    fechaPichanga: Date,
    horaCorte: number
): boolean => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })

    const nowParts = formatter
        .formatToParts(new Date())
        .reduce<Record<string, string>>((acc, part) => {
            if (part.type !== 'literal') acc[part.type] = part.value
            return acc
        }, {})

    const matchParts = formatter
        .formatToParts(fechaPichanga)
        .reduce<Record<string, string>>((acc, part) => {
            if (part.type !== 'literal') acc[part.type] = part.value
            return acc
        }, {})

    const mismoDia =
        nowParts.year === matchParts.year &&
        nowParts.month === matchParts.month &&
        nowParts.day === matchParts.day

    if (!mismoDia) return false

    const minutosNow = Number(nowParts.hour) * 60 + Number(nowParts.minute)
    return minutosNow >= horaCorte * 60
}

export const load: PageServerLoad = async ({ params, locals }) => {
    const { id_pichanga } = params

    return {
        name_page: 'Lista en tiempo real',
        gestores: loadGestores(),
        pichanga: prisma.pichanga
            .findUnique({
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
                            apodo: true,
                            posiciones: true,
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
                                    posiciones: true,
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
            .then((data) => {
                if (!data) error(404, 'Pichanga no encontrada')
                if (
                    data.fechaInicioIncripcion &&
                    data.fechaInicioIncripcion > new Date()
                ) {
                    schedulePichangaOpen(data.id, data.fechaInicioIncripcion)
                }
                return data
            }),
    }
}

export const actions = {
    editar: async ({ params, request, locals }) => {
        const { id_pichanga } = params
        const form = await request.formData()
        const name = form.get('name-pichanga')
        const date = form.get('date-pichanga')
        const location = form.get('location')
        const admins = form
            .getAll('admins')
            .map((a) => a.toString())
            .filter((a) => a.length > 0)
        const max_players = form.get('max_players')
        const habilitar = form
            .getAll('habilitar')
            .map((v) => v.toString())
            .includes('on')
        const date_init_register_input = form
            .get('date-init-register')
            ?.toString()

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
            throw redirect(
                302,
                '/app?error=No tienes permisos para editar esta pichanga.'
            )
        }

        // ── Validaciones ──────────────────────────────────────────────
        const nameStr = (name ?? '').toString().trim()
        if (!nameStr) {
            return fail(400, {
                error: 'El nombre de la pichanga es obligatorio',
            })
        }

        if (!date) {
            return fail(400, {
                error: 'La fecha de la pichanga es obligatoria',
            })
        }
        const dateStr = date.toString()
        if (!isUTCISO(dateStr)) {
            return fail(400, {
                error: 'La fecha de la pichanga debe venir en formato UTC (ISO 8601 con Z u offset)',
            })
        }
        const fechaDate = parseUTCDate(dateStr)
        if (!fechaDate) {
            return fail(400, { error: 'La fecha de la pichanga no es válida' })
        }

        const locationStr = (location ?? '').toString().trim()

        if (admins.length === 0) {
            return fail(400, {
                error: 'Debes seleccionar al menos un administrador',
            })
        }

        const maxPlayersNum = parseInt((max_players ?? '').toString(), 10)
        if (!max_players || Number.isNaN(maxPlayersNum) || maxPlayersNum <= 0) {
            return fail(400, {
                error: 'El número máximo de jugadores debe ser un entero positivo',
            })
        }

        // Fecha de inicio de inscripción: si el switch está activo, ahora;
        // si no, se usa la fecha del input (que es obligatoria en ese caso).
        let fechaInicioIncripcion: Date
        if (habilitar) {
            fechaInicioIncripcion = new Date()
        } else {
            if (!date_init_register_input) {
                return fail(400, {
                    error: 'Indica la fecha de inicio de inscripción o activa el switch',
                })
            }
            if (!isUTCISO(date_init_register_input)) {
                return fail(400, {
                    error: 'La fecha de inicio de inscripción debe venir en formato UTC (ISO 8601 con Z u offset)',
                })
            }
            const parsed = parseUTCDate(date_init_register_input)
            if (!parsed) {
                return fail(400, {
                    error: 'La fecha de inicio de inscripción no es válida',
                })
            }
            fechaInicioIncripcion = parsed
        }

        if (fechaInicioIncripcion >= fechaDate) {
            return fail(400, {
                error: 'La fecha de inicio de inscripción debe ser anterior a la fecha del partido',
            })
        }

        // Verificar que todos los admins existan antes de hacer update
        const existingAdmins = await prisma.user.findMany({
            where: { id: { in: admins } },
            select: { id: true },
        })
        if (existingAdmins.length !== admins.length) {
            const found = new Set(existingAdmins.map((a) => a.id))
            const missing = admins.filter((id) => !found.has(id))
            return fail(400, {
                error: `Los siguientes admins no existen: ${missing.join(', ')}`,
            })
        }

        // ── Persistir ────────────────────────────────────────────────
        await prisma.pichanga.update({
            where: {
                id: id_pichanga,
            },
            data: {
                nombre: nameStr,
                fecha: fechaDate,
                lugar: locationStr || null,
                maxJugadores: maxPlayersNum,
                fechaInicioIncripcion,
                admins: {
                    set: admins.map((id) => ({ id })),
                },
            },
        })

        logger.info(
            {
                accion: 'editar',
                usuarioId: locals.user.id,
                pichangaId: id_pichanga,
                new_status: {
                    nombre: nameStr,
                    fecha: fechaDate.toISOString(),
                    lugar: locationStr || null,
                    maxJugadores: maxPlayersNum,
                    fechaInicioIncripcion: fechaInicioIncripcion.toISOString(),
                    admins: admins.map((id) => ({ id })),
                },
            },
            `Usuario ${locals.user.id} editó la pichanga ${id_pichanga}`
        )

        publishPichangaUpdate(id_pichanga, 'edited')
        schedulePichangaOpen(id_pichanga, fechaInicioIncripcion)

        return { success: true }
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

        const tarjetaRojaVigente = await prisma.tarjetas.findFirst({
            where: {
                userId: user.id,
                tipoCarta: 'roja',
                usado: false,
                venceEn: { gt: now },
            },
            select: { id: true, venceEn: true },
        })

        if (tarjetaRojaVigente) {
            return fail(403, {
                error: 'No puedes inscribirte: tienes una tarjeta roja vigente',
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

        if (isAfterHourChileOnMatchDay(pichanga.fecha, 12)) {
            const ahora = new Date()
            const venceEnRoja = new Date(
                ahora.getTime() + 6 * 24 * 60 * 60 * 1000
            )

            await prisma.tarjetas.create({
                data: {
                    userId: user.id,
                    tipoCarta: 'roja',
                    razon: 'Salida tardía de la pichanga después de las 12:00 hora Chile del día del partido',
                    usado: false,
                    quienAsignoId: null,
                    venceEn: venceEnRoja,
                },
            })

            logger.info(
                {
                    accion: 'tarjeta_roja_salida_muy_tardia',
                    usuarioId: user.id,
                    pichangaId: id_pichanga,
                    venceEn: venceEnRoja,
                },
                `Se asignó una tarjeta roja directa al usuario ${user.id} por salida muy tardía de la pichanga ${id_pichanga}`
            )
        } else if (isAfterHourChileOnMatchDay(pichanga.fecha, 8)) {
            const ahora = new Date()
            const venceEnAmarilla = new Date(
                ahora.getTime() + 6 * 24 * 60 * 60 * 1000
            )

            await prisma.tarjetas.create({
                data: {
                    userId: user.id,
                    tipoCarta: 'amarilla',
                    razon: 'Salida tardía de la pichanga después de las 08:00 hora Chile del día del partido',
                    usado: false,
                    quienAsignoId: null,
                    venceEn: venceEnAmarilla,
                },
            })

            logger.info(
                {
                    accion: 'tarjeta_amarilla_salida_tardia',
                    usuarioId: user.id,
                    pichangaId: id_pichanga,
                    venceEn: venceEnAmarilla,
                },
                `Se asignó una tarjeta amarilla al usuario ${user.id} por salida tardía de la pichanga ${id_pichanga}`
            )

            const amarillasPreviasSinUsar = await prisma.tarjetas.findMany({
                where: {
                    userId: user.id,
                    tipoCarta: 'amarilla',
                    usado: false,
                    venceEn: { gt: ahora },
                },
                select: { id: true },
            })

            if (amarillasPreviasSinUsar.length >= 2) {
                await prisma.tarjetas.updateMany({
                    where: {
                        id: { in: amarillasPreviasSinUsar.map((t) => t.id) },
                    },
                    data: { usado: true },
                })

                const venceEnRoja = new Date(
                    ahora.getTime() + 6 * 24 * 60 * 60 * 1000
                )

                await prisma.tarjetas.create({
                    data: {
                        userId: user.id,
                        tipoCarta: 'roja',
                        razon: 'Acumulación de tarjetas amarillas sin usar',
                        usado: false,
                        quienAsignoId: null,
                        venceEn: venceEnRoja,
                    },
                })

                logger.info(
                    {
                        accion: 'tarjeta_roja_acumulacion_amarillas',
                        usuarioId: user.id,
                        pichangaId: id_pichanga,
                        amarillasConsumidas: amarillasPreviasSinUsar.length,
                        venceEn: venceEnRoja,
                    },
                    `Se asignó una tarjeta roja al usuario ${user.id} tras acumular amarillas sin usar`
                )
            }
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

        if (!user.permisos.includes(Permissions.EditarPartidos)) {
            logger.info(
                {
                    action: 'action_delete_pichanga_forbidden',
                    userId: user.id,
                    pichangaId: id_pichanga,
                },
                'Intento de eliminar pichanga sin permisos'
            )
            throw redirect(
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

        cancelPichangaOpen(id_pichanga)

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
