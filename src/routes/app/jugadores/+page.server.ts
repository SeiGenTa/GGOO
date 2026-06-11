import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { prisma } from '$utils/prisma.js'
import { Permissions } from '$lib/permissions.js'

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, '/auth')
    }

    if (!locals.user.permisos.includes(Permissions.VerEstadisticas)) {
        redirect(302, '/app?error=No tienes permisos para acceder a esta página.')
    }

    const jugadores = await prisma.user.findMany({
        select: {
            id: true,
            nombre: true,
            apodo: true,
            posiciones: true,
            statAtaque: true,
            statRecepcion: true,
            statBloqueo: true,
            statSaque: true,
            statArmada: true,
        },
        orderBy: { nombre: 'asc' },
    })

    const canEdit = locals.user.permisos.includes(Permissions.EditarEstadisticas)

    return { jugadores, canEdit, name_page: 'Jugadores' }
}

function parseStat(raw: FormDataEntryValue | null): number | null | 'invalid' {
    if (raw === null || (raw as string) === '') return null
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 10) return 'invalid'
    return n
}

export const actions: Actions = {
    update_stats: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'No autorizado.' })
        }

        if (!locals.user.permisos.includes(Permissions.EditarEstadisticas)) {
            return fail(403, { message: 'No tienes permisos para editar estadísticas.' })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const statAtaque = parseStat(form.get('statAtaque'))
        const statRecepcion = parseStat(form.get('statRecepcion'))
        const statBloqueo = parseStat(form.get('statBloqueo'))
        const statSaque = parseStat(form.get('statSaque'))
        const statArmada = parseStat(form.get('statArmada'))

        if (
            statAtaque === 'invalid' ||
            statRecepcion === 'invalid' ||
            statBloqueo === 'invalid' ||
            statSaque === 'invalid' ||
            statArmada === 'invalid'
        ) {
            return fail(400, { message: 'Los valores de estadísticas deben ser enteros entre 1 y 10.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                statAtaque: statAtaque as number | null,
                statRecepcion: statRecepcion as number | null,
                statBloqueo: statBloqueo as number | null,
                statSaque: statSaque as number | null,
                statArmada: statArmada as number | null,
            },
        })

        return { success: true, message: 'Estadísticas actualizadas correctamente.' }
    },
}
