/**
 * Módulo de permisos basado en Bitmask (Máscara de bits).
 *
 * Cada permiso del sistema se asocia a un único bit dentro de un entero
 * de 32 bits. Esto permite empaquetar TODOS los permisos de un usuario
 * en un único `number` que viaja en el payload del JWT, reduciendo su
 * tamaño drásticamente (de ~1.1 KB a ~200 bytes) y previniendo errores
 * 502 Bad Gateway en producción cuando Nginx reenvía la cookie con
 * `proxy_buffering off`.
 *
 * Esquema de bits (22 permisos actuales; soporta hasta 31):
 *
 *   bit  0 (1 <<  0) = ver_partidos
 *   bit  1 (1 <<  1) = crear_partidos
 *   bit  2 (1 <<  2) = editar_partidos
 *   bit  3 (1 <<  3) = inscribirse_pichanga
 *   bit  4 (1 <<  4) = administrar_pichanga
 *   bit  5 (1 <<  5) = ver_tarjetas
 *   bit  6 (1 <<  6) = crear_tarjetas
 *   bit  7 (1 <<  7) = editar_tarjetas
 *   bit  8 (1 <<  8) = eliminar_tarjetas
 *   bit  9 (1 <<  9) = ver_mis_tarjetas
 *   bit 10 (1 << 10) = ver_miembros
 *   bit 11 (1 << 11) = aceptar_miembros
 *   bit 12 (1 << 12) = borrar_miembros
 *   bit 13 (1 << 13) = crear_roles
 *   bit 14 (1 << 14) = editar_roles
 *   bit 15 (1 << 15) = eliminar_roles
 *   bit 16 (1 << 16) = ver_roles_usuarios
 *   bit 17 (1 << 17) = asignar_roles
 *   bit 18 (1 << 18) = ver_estadisticas
 *   bit 19 (1 << 19) = editar_estadisticas
 *
 * Importante: este módulo es server-only (ubicado en $lib/server/).
 * Contiene la lógica de conversión desde la base de datos (String[])
 * al bitmask que viaja en el JWT.
 *
 * Para los bits y la función `tienePermiso` en el cliente (sidebar y
 * componentes Svelte), importar desde `$lib/permissions`, que re-exporta
 * los valores numéricos sin incluir la lógica de DB.
 */
import { Permissions } from '$lib/permissions'

/**
 * Mapa inmutable: nombre del permiso (string) -> bit correspondiente.
 *
 * Usar `as const` garantiza que los valores se traten como literales
 * numéricos en tiempo de compilación y se conserva la inferencia de tipo.
 */
export const PERMISSION_BITS = {
    [Permissions.VerPartidos]: 1 << 0,
    [Permissions.CrearPartidos]: 1 << 1,
    [Permissions.EditarPartidos]: 1 << 2,
    [Permissions.InscribirsePichanga]: 1 << 3,
    [Permissions.AdministrarPichanga]: 1 << 4,
    [Permissions.VerTarjetas]: 1 << 5,
    [Permissions.CrearTarjetas]: 1 << 6,
    [Permissions.EditarTarjetas]: 1 << 7,
    [Permissions.EliminarTarjetas]: 1 << 8,
    [Permissions.VerMisTarjetas]: 1 << 9,
    [Permissions.VerMiembros]: 1 << 10,
    [Permissions.AceptarMiembros]: 1 << 11,
    [Permissions.BorrarMiembros]: 1 << 12,
    [Permissions.CrearRoles]: 1 << 13,
    [Permissions.EditarRoles]: 1 << 14,
    [Permissions.EliminarRoles]: 1 << 15,
    [Permissions.VerRolesUsuarios]: 1 << 16,
    [Permissions.AsignarRoles]: 1 << 17,
    [Permissions.VerEstadisticas]: 1 << 18,
    [Permissions.EditarEstadisticas]: 1 << 19,
} as const

/** Tipo: un bit individual o una combinación OR de varios bits. */
export type PermissionBit = number

/**
 * Máscara con TODOS los permisos activados.
 *
 * Útil para representar a un usuario administrador o para inicializar
 * un bitmask "con todos los permisos". Se calcula con un OR acumulado
 * para que se mantenga sincronizado automáticamente si se añaden
 * nuevos permisos al mapa `PERMISSION_BITS`.
 */
export const ALL_PERMISSIONS_MASK: number = Object.values(
    PERMISSION_BITS
).reduce((acc, bit) => acc | bit, 0)

/**
 * Convierte un array de strings (formato almacenado en PostgreSQL y
 * en el modelo Prisma `User.permisos` / `Rol.permisos`) a un único
 * entero (bitmask).
 *
 * Realiza una operación OR por cada permiso conocido, ignorando
 * silenciosamente cualquier string que no exista en `PERMISSION_BITS`.
 * Esto permite tolerar datos sucios en la base de datos durante la
 * transición sin que la aplicación reviente.
 *
 * @param strings Array de nombres de permisos (ej. ['ver_partidos', 'crear_partidos'])
 * @returns Entero con todos los bits correspondientes activados
 */
export const permisosToBitmask = (strings: readonly string[]): number => {
    let mask = 0
    for (const name of strings) {
        const bit = (PERMISSION_BITS as Record<string, number>)[name]
        if (typeof bit === 'number') {
            mask |= bit
        }
    }
    return mask
}

/**
 * Verifica rápidamente si un bitmask de usuario contiene el permiso
 * (o la combinación de permisos) requerido.
 *
 * Implementación con operador AND a nivel de bits (`&`). Es la
 * operación más rápida posible en JS: una sola instrucción de CPU.
 *
 * Acepta tanto un único bit como una combinación OR previa
 * (ej. `tienePermiso(mask, VER_PARTIDOS | CREAR_PARTIDOS)`).
 *
 * @param bitmaskUsuario Bitmask actual del usuario (0 si no tiene permisos)
 * @param bitPermiso Bit individual o máscara a verificar
 * @returns true si TODOS los bits de `bitPermiso` están presentes
 */
export const tienePermiso = (
    bitmaskUsuario: number,
    bitPermiso: number
): boolean => {
    if (!bitPermiso) return true
    return (bitmaskUsuario & bitPermiso) === bitPermiso
}

/**
 * Decodifica un bitmask de vuelta a su representación como array de
 * strings. Útil para componentes de UI que necesiten iterar sobre
 * los permisos del usuario (ej. vista de "mis permisos").
 *
 * El orden del array resultante es estable y sigue el orden de
 * declaración de `PERMISSION_BITS`.
 *
 * @param bitmask Bitmask del usuario
 * @returns Array con los nombres de los permisos activados
 */
export const bitmaskToPermisos = (bitmask: number): string[] => {
    const result: string[] = []
    for (const [name, bit] of Object.entries(PERMISSION_BITS)) {
        if ((bitmask & bit) === bit) {
            result.push(name)
        }
    }
    return result
}

/**
 * Helper "wrap" que combina el chequeo de admin y el chequeo de
 * bitmask en una sola llamada. Cubre el patrón más repetido del
 * proyecto: "este usuario puede hacer X si es admin o tiene el bit".
 *
 * Ejemplo de uso:
 *   if (!userCan(locals.user, PERMISSION_BITS[Permissions.CrearRoles])) {
 *       return fail(403, { message: 'No autorizado' })
 *   }
 *
 * @param user Usuario de `event.locals.user` (puede ser null)
 * @param bit  Bit o máscara a verificar
 * @returns true si el usuario es admin o tiene el bit activo
 */
export const userCan = (
    user: { es_admin: boolean; permisos: number } | null | undefined,
    bit: number
): boolean => {
    if (!user) return false
    if (user.es_admin) return true
    return tienePermiso(user.permisos, bit)
}
