import { prisma } from '$utils/prisma'
import logger from '$lib/logger'
import type { RequestHandler } from './$types'

const MODELS = [
    { delegate: 'user', table: 'User' },
    { delegate: 'rol', table: 'Rol' },
    { delegate: 'pichanga', table: 'Pichanga' },
    { delegate: 'inscripcion', table: 'Inscripcion' },
    { delegate: 'tarjetas', table: 'Tarjetas' },
    { delegate: 'reclamosCarta', table: 'ReclamosCarta' },
    { delegate: 'castigo', table: 'Castigo' },
    { delegate: 'refreshToken', table: 'RefreshToken' },
] as const

type DelegateName = (typeof MODELS)[number]['delegate']

type FindFirstDelegate = {
    findFirst: (args: {
        select: { id: true }
        take: number
    }) => Promise<unknown>
}

type TableStatus = {
    table: string
    exists: boolean
    accessible: boolean
    error?: string
}

type HealthResponse = {
    status: 'healthy' | 'unhealthy'
    database: 'up' | 'down'
    tables: Record<string, TableStatus>
    elapsedMs: number
    timestamp: string
}

const buildResponse = (
    database: 'up' | 'down',
    tables: Record<string, TableStatus>,
    startedAt: number
): HealthResponse => {
    const allOk =
        database === 'up' &&
        Object.values(tables).every((t) => t.exists && t.accessible)
    return {
        status: allOk ? 'healthy' : 'unhealthy',
        database,
        tables,
        elapsedMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
    }
}

export const GET: RequestHandler = async () => {
    const startedAt = Date.now()
    const tables: Record<string, TableStatus> = {}

    let database: 'up' | 'down' = 'down'
    try {
        await prisma.$queryRaw`SELECT 1`
        database = 'up'
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(
            { action: 'health_db_unreachable', err: message },
            'No se pudo conectar a la base de datos'
        )
        const body = buildResponse('down', tables, startedAt)
        return new Response(JSON.stringify(body, null, 2), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    let existingTables: Set<string> = new Set()
    try {
        const rows = await prisma.$queryRaw<{ table_name: string }[]>`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `
        existingTables = new Set(rows.map((r) => r.table_name))
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(
            { action: 'health_schema_query_failed', err: message },
            'No se pudo consultar information_schema'
        )
    }

    await Promise.all(
        MODELS.map(async ({ delegate, table }) => {
            const exists = existingTables.has(table)
            let accessible = false
            let error: string | undefined

            if (!exists) {
                error = 'Tabla no existe en la base de datos'
            } else {
                try {
                    await (
                        prisma as unknown as Record<
                            DelegateName,
                            FindFirstDelegate
                        >
                    )[delegate].findFirst({
                        select: { id: true },
                        take: 1,
                    })
                    accessible = true
                } catch (err) {
                    error = err instanceof Error ? err.message : String(err)
                }
            }

            tables[delegate] = { table, exists, accessible, error }
        })
    )

    const body = buildResponse(database, tables, startedAt)

    if (body.status !== 'healthy') {
        logger.warn(
            { action: 'health_check_failed', response: body },
            'Health check fallo'
        )
    }

    return new Response(JSON.stringify(body, null, 2), {
        status: body.status === 'healthy' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
    })
}
