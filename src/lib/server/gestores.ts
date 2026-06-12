import { prisma } from '$utils/prisma'
import { Permissions } from '$lib/permissions'

export type GestorOption = {
    value: string
    label: string
}

/**
 * Devuelve los usuarios que pueden administrar pichangas.
 *
 * Se consideran gestores quienes cumplan al menos una de:
 *  - tengan `es_admin === true` en `User`,
 *  - tengan el permiso `AdministrarPichanga` directo en `User.permisos`,
 *  - tengan un `Rol` que incluya el permiso `AdministrarPichanga`.
 *
 * Se devuelven como opciones listas para un `<Select multiple>`.
 */
export const loadGestores = async (): Promise<GestorOption[]> => {
    const gestores = await prisma.user.findMany({
        where: {
            OR: [
                {
                    roles: {
                        some: {
                            permisos: {
                                has: Permissions.AdministrarPichanga.toString(),
                            },
                        },
                    },
                },
                {
                    permisos: {
                        has: Permissions.AdministrarPichanga.toString(),
                    },
                },
                {
                    es_admin: true,
                },
            ],
        },
        select: {
            id: true,
            nombre: true,
            apodo: true,
        },
    })

    return gestores.map((g) => ({
        value: g.id,
        label: `${g.nombre} ${g.apodo ? `(${g.apodo})` : ''}`,
    }))
}
