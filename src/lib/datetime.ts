/**
 * Utilidades de fecha/hora con un contrato de wire-format explícito:
 *
 *  - En el navegador el usuario ve y edita fechas en su hora local.
 *  - Todo lo que cruza la frontera cliente/servidor va en UTC ISO 8601
 *    (terminado en `Z` o con offset numérico).
 *  - El servidor persiste siempre UTC.
 *  - Ambos extremos traducen al horario local solo para mostrar.
 */

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

/**
 * Convierte el valor de un `<input type="datetime-local">` (hora local
 * naive, sin zona) a un string ISO 8601 en UTC terminado en `Z`.
 *
 * Lanza un error si el input no respeta el formato esperado.
 */
export const localDateTimeInputToUTCISO = (input: string): string => {
    if (!DATETIME_LOCAL_RE.test(input)) {
        throw new Error(
            `Formato de fecha local inválido: "${input}". Se esperaba YYYY-MM-DDTHH:mm[:ss].`
        )
    }
    const parsed = new Date(input)
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Fecha local inválida: "${input}"`)
    }
    return parsed.toISOString()
}

/**
 * Convierte un string ISO 8601 (en UTC o con offset) al formato que
 * espera `<input type="datetime-local">`: `YYYY-MM-DDTHH:mm` en hora
 * local del navegador.
 *
 * Devuelve string vacío si el input no se puede parsear.
 */
export const utcISOToLocalDateTimeInput = (
    value: string | Date | null | undefined
): string => {
    if (value === null || value === undefined || value === '') {
        return ''
    }
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) {
        return ''
    }
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Parsea un valor de fecha recibido en el servidor.
 * Acepta tanto ISO 8601 con `Z`/offset como formatos naive.
 * Devuelve `null` si el valor es vacío o inválido.
 */
export const parseUTCDate = (value: string | null | undefined): Date | null => {
    if (value === null || value === undefined || value === '') {
        return null
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return null
    }
    return parsed
}

/**
 * Verifica que el valor recibido sea un string ISO 8601 con zona
 * explícita (termina en `Z` o tiene offset `±HH:MM`). Útil para
 * asegurar que el front envió el contrato correcto.
 */
export const hasUTCIndicator = (value: string): boolean => {
    return /(Z|[+-]\d{2}:?\d{2})$/.test(value)
}

/**
 * Devuelve true si el string representa un instante UTC explícito
 * (con `Z` u offset numérico). Lanza si el string no es parseable.
 */
export const isUTCISO = (value: string): boolean => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return false
    }
    return hasUTCIndicator(value)
}

/**
 * Formatea un instante en el huso horario de Chile (America/Santiago),
 * devolviendo un string legible en español chileno.
 *
 * Ejemplo: `formatChileDateTime("2025-01-15T13:00:00Z")` → `"15-01-2025 10:00"`
 */
export const formatChileDateTime = (
    value: string | Date | null | undefined
): string => {
    if (value === null || value === undefined || value === '') {
        return ''
    }
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) {
        return ''
    }
    const fmt = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
    return fmt.format(d)
}
