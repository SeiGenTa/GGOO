import { Permissions } from '$lib/permissions.js'
import { prisma } from '$utils/prisma.js'
import type { RequestHandler } from './$types'
import logger from '$lib/logger'

const avalible_options_selects = ['id', 'nombre', 'email', 'apodo']

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        logger.info(
            { action: 'api_user_get_unauthorized' },
            'Intento de listar usuarios sin autenticación'
        )
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }
    if (!locals.user.permisos.includes(Permissions.CrearPartidos)) {
        logger.info(
            { action: 'api_user_get_forbidden', userId: locals.user.id },
            'Intento de listar usuarios sin permisos'
        )
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    const selects = url.searchParams.getAll('select') ?? []
    const query_es_admin = url.searchParams.get('es_admin')
    let es_admin = null
    if (query_es_admin) {
        es_admin = query_es_admin === 'true' ? true : false
    }
    const limit = url.searchParams.get('limit') || 10

    const users = await prisma.user.findMany({
        select: {
            id: selects.includes('id') ? true : false,
            nombre: selects.includes('nombre') ? true : false,
            email: selects.includes('email') ? true : false,
            apodo: selects.includes('apodo') ? true : false,
        },
        where: {
            es_admin: es_admin !== null ? es_admin : undefined,
        },
        take: Number(limit),
    })

    return new Response(JSON.stringify({ user: users }), {
        headers: {
            'Content-Type': 'application/json',
        },
    })
}
