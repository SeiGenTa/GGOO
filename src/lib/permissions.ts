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
