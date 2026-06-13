import { prisma } from '$utils/prisma'
import { Prisma } from '$generated/prisma/client'
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

/**
 * Construye una sola raw query con `UNION ALL` que verifica accesibilidad
 * de todas las tablas en un único round-trip a la DB.
 *
 * Cada rama es `(SELECT '<tabla>' AS table_name, EXISTS(...) AS
 * has_rows FROM ...)` envuelta en paréntesis (requerido por la
 * sintaxis de PostgreSQL al usar `LIMIT` dentro de una unión).
 *
 * `EXISTS(SELECT 1 FROM "<tabla>")` retorna un booleano (true/false)
 * y siempre produce una fila, incluso si la tabla está vacía. Si la
 * tabla no existe, la query completa falla. Usamos la presencia de
 * la fila como señal de "tabla accesible" (independiente de si tiene
 * o no registros) y conservamos `has_rows` como información
 * adicional útil para diagnóstico.
 */
const buildAccessibilityQuery = (): Prisma.Sql => {
    const branches = MODELS.map(
        ({ table }) => Prisma.sql`
            (SELECT ${table} AS table_name,
                    EXISTS(SELECT 1 FROM ${Prisma.raw(`"${table}"`)}) AS has_rows)
        `
    )
    return Prisma.sql`${Prisma.join(branches, ' UNION ALL ')}`
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

    try {
        const rows = await prisma.$queryRaw<
            { table_name: string; has_rows: boolean }[]
        >(buildAccessibilityQuery())

        for (const { delegate, table } of MODELS) {
            const row = rows.find((r) => r.table_name === table)
            tables[delegate] = {
                table,
                exists: !!row,
                accessible: !!row,
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(
            { action: 'health_table_check_failed', err: message },
            'No se pudo verificar la accesibilidad de las tablas'
        )
        for (const { delegate, table } of MODELS) {
            tables[delegate] = {
                table,
                exists: false,
                accessible: false,
                error: message,
            }
        }
    }

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
