import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";
import { Permissions } from "./permissions";

const ALL_PERMISSIONS = Object.values(Permissions);

const getUserPermissions = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            es_admin: true,
            permisos: true,
            roles: {
                select: {
                    permisos: true,
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    if (user.es_admin) {
        return {
            isAdmin: true,
            permissions: new Set(ALL_PERMISSIONS),
        };
    }

    const rolePermissions = user.roles.flatMap((role) => role.permisos);
    return {
        isAdmin: false,
        permissions: new Set([...user.permisos, ...rolePermissions]),
    };
};

const canUseAny = async (userId: string, requiredPermissions: string[]) => {
    const userPermissions = await getUserPermissions(userId);
    if (!userPermissions) {
        return false;
    }

    if (userPermissions.isAdmin) {
        return true;
    }

    return requiredPermissions.some((permission) => userPermissions.permissions.has(permission));
};

const parsePermissions = (form: FormData) => {
    const selected = form.getAll("permisos").map((permission) => String(permission));
    return selected.filter((permission) => ALL_PERMISSIONS.includes(permission as Permissions));
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/auth");
    }

    const canView = await canUseAny(locals.user.id, [
        Permissions.VerRolesUsuarios,
        Permissions.CrearRoles,
        Permissions.EditarRoles,
        Permissions.EliminarRoles,
    ]);

    if (!canView) {
        return {
            name_page: "Permisos",
            roles: [],
            permissions: ALL_PERMISSIONS,
            blocked: true,
        };
    }

    const roles = await prisma.rol.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                },
            },
        },
        orderBy: {
            nombre: "asc",
        },
    });

    const typedRoles = roles as Array<{ id: string; nombre: string; permisos: string[]; _count: { users: number } }>;

    return {
        name_page: "Permisos",
        roles: typedRoles.map((role) => ({
            id: role.id,
            nombre: role.nombre,
            permisos: role.permisos,
            users_count: role._count.users,
        })),
        permissions: ALL_PERMISSIONS,
        blocked: false,
    };
};

export const actions: Actions = {
    create_role: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const canCreate = await canUseAny(locals.user.id, [Permissions.CrearRoles]);
        if (!canCreate) {
            return fail(403, { message: "No tienes permisos para crear roles." });
        }

        const form = await request.formData();
        const nombre = (form.get("nombre") as string | null)?.trim();
        const permisos = parsePermissions(form);

        if (!nombre) {
            return fail(400, { message: "El nombre del rol es obligatorio." });
        }

        const existing = await prisma.rol.findFirst({
            where: {
                nombre: {
                    equals: nombre,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
            },
        });

        if (existing) {
            return fail(400, { message: "Ya existe un rol con ese nombre." });
        }

        await prisma.rol.create({
            data: {
                nombre,
                permisos,
            },
        });

        return {
            success: true,
            message: "Rol creado correctamente.",
        };
    },

    update_role: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const canEdit = await canUseAny(locals.user.id, [Permissions.EditarRoles]);
        if (!canEdit) {
            return fail(403, { message: "No tienes permisos para editar roles." });
        }

        const form = await request.formData();
        const roleId = (form.get("roleId") as string | null)?.trim();
        const nombre = (form.get("nombre") as string | null)?.trim();
        const permisos = parsePermissions(form);

        if (!roleId) {
            return fail(400, { message: "Rol inválido." });
        }

        if (!nombre) {
            return fail(400, { message: "El nombre del rol es obligatorio." });
        }

        const role = await prisma.rol.findUnique({
            where: {
                id: roleId,
            },
            select: {
                id: true,
            },
        });

        if (!role) {
            return fail(404, { message: "El rol no existe." });
        }

        const duplicated = await prisma.rol.findFirst({
            where: {
                id: { not: roleId },
                nombre: {
                    equals: nombre,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
            },
        });

        if (duplicated) {
            return fail(400, { message: "Ya existe otro rol con ese nombre." });
        }

        await prisma.rol.update({
            where: {
                id: roleId,
            },
            data: {
                nombre,
                permisos,
            },
        });

        return {
            success: true,
            message: "Rol actualizado correctamente.",
        };
    },

    delete_role: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const canDelete = await canUseAny(locals.user.id, [Permissions.EliminarRoles]);
        if (!canDelete) {
            return fail(403, { message: "No tienes permisos para eliminar roles." });
        }

        const form = await request.formData();
        const roleId = (form.get("roleId") as string | null)?.trim();

        if (!roleId) {
            return fail(400, { message: "Rol inválido." });
        }

        const role = await prisma.rol.findUnique({
            where: {
                id: roleId,
            },
            select: {
                id: true,
            },
        });

        if (!role) {
            return fail(404, { message: "El rol no existe." });
        }

        await prisma.rol.delete({
            where: {
                id: roleId,
            },
        });

        return {
            success: true,
            message: "Rol eliminado correctamente.",
        };
    },
};
