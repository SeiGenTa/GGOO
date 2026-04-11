import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";
import { Permissions } from "../../../lib/permissions";

const ALL_PERMISSIONS = Object.values(Permissions);

const parsePermissions = (form: FormData) => {
    const selected = form.getAll("permisos").map((permission) => String(permission));
    return selected.filter((permission) => ALL_PERMISSIONS.includes(permission as Permissions));
};

export const load: PageServerLoad = async ({ locals, depends }) => {
    depends("app:permissions");
    
    if (!locals.user) {
        redirect(302, "/auth");
    }

    if (!locals.user.permisos.includes(Permissions.VerRolesUsuarios)) {
        redirect(302, "/app?error=No tienes permisos para acceder a esta página.");
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

    const typedRoles = roles as Array<{ id: string; nombre: string; permisos: string[]; _count: { users: number }, is_default: boolean }>;

    return {
        name_page: "Permisos",
        roles: typedRoles.map((role) => ({
            id: role.id,
            nombre: role.nombre,
            permisos: role.permisos,
            users_count: role._count.users,
            is_default: role.is_default,
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

        if (!locals.user.permisos.includes(Permissions.CrearRoles)) {
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

        if (!locals.user.permisos.includes(Permissions.EditarRoles)) {
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

        if (!locals.user.permisos.includes(Permissions.EliminarRoles)) {
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
    set_predeterminated: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        if (!locals.user.permisos.includes(Permissions.EditarRoles)) {
            return fail(403, { message: "No tienes permisos para editar roles." });
        }

        const form = await request.formData();
        const roleId = (form.get("roleId") as string | null)?.trim();
        const isDefault = form.get("is_default") === "true";

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

        if (isDefault) {
            await prisma.$transaction([
                prisma.rol.updateMany({
                    where: {
                        is_default: true,
                    },
                    data: {
                        is_default: false,
                    },
                }),
                prisma.rol.update({
                    where: {
                        id: roleId,
                    },
                    data: {
                        is_default: true,
                    },
                }),
            ]);
        }
        else {
            await prisma.rol.update({
                where: {
                    id: roleId,
                },
                data: {
                    is_default: false,
                },
            });
        }



        return {
            success: true,
            message: "Rol predeterminado actualizado correctamente.",
        };
    }
};
