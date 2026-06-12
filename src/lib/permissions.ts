export enum Permissions {
    VerPartidos = 'ver_partidos',
    CrearPartidos = 'crear_partidos',
    EditarPartidos = 'editar_partidos',

    InscribirsePichanga = 'inscribirse_pichanga',
    AdministrarPichanga = 'administrar_pichanga',

    // Permisos relacionados con tarjetas
    VerTarjetas = 'ver_tarjetas',
    CrearTarjetas = 'crear_tarjetas',
    EditarTarjetas = 'editar_tarjetas',
    EliminarTarjetas = 'eliminar_tarjetas',
    VerMisTarjetas = 'ver_mis_tarjetas',

    VerMiembros = 'ver_miembros',
    AceptarMiembros = 'aceptar_miembros',
    BorrarMiembros = 'borrar_miembros',

    CrearRoles = 'crear_roles',
    EditarRoles = 'editar_roles',
    EliminarRoles = 'eliminar_roles',
    VerRolesUsuarios = 'ver_roles_usuarios',
    AsignarRoles = 'asignar_roles',

    // Permisos relacionados con estadísticas de jugadores
    VerEstadisticas = 'ver_estadisticas',
    EditarEstadisticas = 'editar_estadisticas',
}

/**
 * Mapa client-safe: nombre del permiso (string) -> bit correspondiente.
 *
 * Se duplica aquí (en lugar de re-exportarse desde `$lib/server/permissions`)
 * para que el bundle del cliente pueda usar los bits sin importar la lógica
 * de DB. Los valores numéricos NO son secretos: cualquier revisor del repo
 * puede derivarlos de `1 << n`. Mantenerlos sincronizados con el módulo
 * server es responsabilidad del proceso de code review.
 */
export const PERMISSION_BITS: { [K in Permissions]: number } = {
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
}

/**
 * Helper client-safe: verifica si un bitmask de usuario contiene un bit
 * (o combinación de bits). Operación AND a nivel de bits; una sola
 * instrucción de CPU.
 *
 * Usar en componentes Svelte y en el sidebar:
 *   tienePermiso(user.permisos, PERMISSION_BITS[Permissions.VerPartidos])
 */
export const tienePermiso = (
    bitmaskUsuario: number,
    bitPermiso: number
): boolean => {
    if (!bitPermiso) return true
    return (bitmaskUsuario & bitPermiso) === bitPermiso
}

export const getNameForPermission = (permiso: Permissions): string => {
    switch (permiso) {
        case Permissions.VerPartidos:
            return 'Ver partidos'
        case Permissions.CrearPartidos:
            return 'Crear partidos'
        case Permissions.EditarPartidos:
            return 'Editar partidos'
        case Permissions.InscribirsePichanga:
            return 'Inscribirse a pichanga'
        case Permissions.AdministrarPichanga:
            return 'Administrar pichanga'
        case Permissions.VerTarjetas:
            return 'Ver tarjetas'
        case Permissions.CrearTarjetas:
            return 'Crear tarjetas'
        case Permissions.EditarTarjetas:
            return 'Editar tarjetas'
        case Permissions.EliminarTarjetas:
            return 'Eliminar tarjetas'
        case Permissions.VerMisTarjetas:
            return 'Ver mis tarjetas'
        case Permissions.VerMiembros:
            return 'Ver miembros'
        case Permissions.AceptarMiembros:
            return 'Aceptar miembros'
        case Permissions.BorrarMiembros:
            return 'Borrar miembros'
        case Permissions.CrearRoles:
            return 'Crear roles'
        case Permissions.EditarRoles:
            return 'Editar roles'
        case Permissions.EliminarRoles:
            return 'Eliminar roles'
        case Permissions.VerRolesUsuarios:
            return 'Ver roles de usuarios'
        case Permissions.AsignarRoles:
            return 'Asignar roles'
        case Permissions.VerEstadisticas:
            return 'Ver estadísticas de jugadores'
        case Permissions.EditarEstadisticas:
            return 'Editar estadísticas de jugadores'
        default:
            return permiso
    }
}
