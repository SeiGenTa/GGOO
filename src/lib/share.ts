/**
 * Utilidades para generar el mensaje configurable que se comparte desde
 * la vista de una pichanga.
 *
 * La plantilla se define en la variable de entorno `PUBLIC_SHARE_MESSAGE`
 * y admite placeholders entre llaves, por ejemplo `{url}` o
 * `{pichanga.fecha}`. Si la plantilla está vacía se comparte solo la URL.
 */

const WEEKDAY_ES: Record<string, string> = {
    Sun: 'DO',
    Mon: 'LU',
    Tue: 'MA',
    Wed: 'MI',
    Thu: 'JU',
    Fri: 'VI',
    Sat: 'SA',
}

/**
 * Formatea un instante en horario de Chile con el formato
 * `MA 13-10-2026, 14:30` (día de la semana de 2 letras, fecha y hora).
 * Devuelve string vacío si el valor no es parseable.
 */
export const formatShareDate = (
    value: string | Date | null | undefined
): string => {
    if (value === null || value === undefined || value === '') return ''

    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return ''

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short',
    })
        .formatToParts(d)
        .reduce<Record<string, string>>((acc, part) => {
            if (part.type !== 'literal') acc[part.type] = part.value
            return acc
        }, {})

    const weekday = WEEKDAY_ES[parts.weekday] ?? parts.weekday
    return `${weekday} ${parts.day}-${parts.month}-${parts.year}, ${parts.hour}:${parts.minute}`
}

type Admin = { nombre?: string | null; apodo?: string | null }

/**
 * Formatea la lista de admins de una pichanga como nombres separados por
 * coma, usando el apodo cuando exista.
 */
export const formatAdmins = (admins: Admin[] | null | undefined): string => {
    if (!admins || admins.length === 0) return ''
    return admins
        .map((admin) => admin.apodo || admin.nombre || '')
        .filter(Boolean)
        .join(', ')
}

type SharePichanga = {
    id?: string
    nombre?: string | null
    lugar?: string | null
    fecha?: string | Date | null
    fechaInicioIncripcion?: string | Date | null
    admins?: Admin[] | null
}

export type ShareContext = {
    url: string
    pichanga: SharePichanga
}

/**
 * Reemplaza los placeholders de la plantilla con los datos de la
 * pichanga. Convierte secuencias `\n` literales en saltos de línea reales.
 * Los placeholders desconocidos se dejan intactos.
 */
export const renderShareMessage = (
    template: string,
    { url, pichanga }: ShareContext
): string => {
    const values: Record<string, string> = {
        url,
        'pichanga.nombre': pichanga.nombre ?? '',
        'pichanga.admins': formatAdmins(pichanga.admins),
        'pichanga.lugar': pichanga.lugar ?? '',
        'pichanga.fecha': formatShareDate(pichanga.fecha),
        'pichanga.fechaInicioIncripcion': formatShareDate(
            pichanga.fechaInicioIncripcion
        ),
    }

    return template
        .replace(/\{([\w.]+)\}/g, (match, key: string) =>
            key in values ? values[key] : match
        )
        .replace(/\\n/g, '\n')
        .trim()
}
