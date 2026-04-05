import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";
import type { Prisma } from "$generated/prisma/client";
import { Permissions } from "../../../lib/permissions";

type SortBy = "nombre" | "id";
type SortDirection = "asc" | "desc";
const PAGE_SIZE = 10;

type RoleSummary = {
    id: string;
    nombre: string;
    permisos: string[];
    users_count: number;
};

type UserSummary = {
    id: string;
    nombre: string;
    email: string;
    apodo: string | null;
    roles: Array<{
        id: string;
        nombre: string;
        permisos: string[];
    }>;
};

const parseSortBy = (value: string | null): SortBy => {
    if (value === "id") {
        return "id";
    }

    return "nombre";
};

const parseSortDirection = (value: string | null): SortDirection => {
    if (value === "desc") {
        return "desc";
    }

    return "asc";
};

const parsePage = (value: string | null): number => {
    const page = Number(value);
    if (!Number.isFinite(page) || page < 1) {
        return 1;
    }

    return Math.floor(page);
};

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        redirect(302, "/auth");
    }

    if (!locals.user.permisos.includes(Permissions.VerRolesUsuarios)) {
        redirect(302, "/app?error=No tienes permisos para acceder a esta página.");
    }

    const q = (url.searchParams.get("q") ?? "").trim();
    const sortBy = parseSortBy(url.searchParams.get("sortBy"));
    const sortDir = parseSortDirection(url.searchParams.get("sortDir"));
    const requestedPage = parsePage(url.searchParams.get("page"));
    const selectedRoleIds = Array.from(
        new Set(
            url.searchParams
                .getAll("roleId")
                .map((roleId) => roleId.trim())
                .filter((roleId) => roleId.length > 0),
        ),
    );

    const where: Prisma.UserWhereInput = {};

    if (q.length > 0) {
        where.OR = [
            { id: { contains: q, mode: "insensitive" } },
            { nombre: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { apodo: { contains: q, mode: "insensitive" } },
        ];
    }

    if (selectedRoleIds.length > 0) {
        where.AND = selectedRoleIds.map((roleId) => ({
            roles: {
                some: {
                    id: roleId,
                },
            },
        }));
    }

    const totalUsersPromise = prisma.user.count({ where });
    const rolesPromise = prisma.rol.findMany({
        select: {
            id: true,
            nombre: true,
            permisos: true,
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

    const [totalUsers, roles] = await Promise.all([totalUsersPromise, rolesPromise]);
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * PAGE_SIZE;

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            nombre: true,
            email: true,
            apodo: true,
            roles: {
                select: {
                    id: true,
                    nombre: true,
                    permisos: true,
                },
            },
        },
        orderBy: sortBy === "id" ? { id: sortDir } : { nombre: sortDir },
        skip,
        take: PAGE_SIZE,
    });

    const typedUsers = users as UserSummary[];
    const typedRoles = roles as Array<{ id: string; nombre: string; permisos: string[]; _count: { users: number } }>;

    return {
        name_page: "Roles",
        users: typedUsers.map((user: UserSummary) => ({
            ...user,
            selectedRoleIds: user.roles.map((role: { id: string }) => role.id),
        })),
        roles: typedRoles.map((role): RoleSummary => ({
            id: role.id,
            nombre: role.nombre,
            permisos: role.permisos,
            users_count: role._count.users,
        })),
        filters: {
            q,
            sortBy,
            sortDir,
            selectedRoleIds,
        },
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            totalItems: totalUsers,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
        blocked: false,
    };
};

export const actions: Actions = {
    assign_roles: async ({ request, locals }) => {
        if (!locals.user!.permisos.includes(Permissions.AsigarRoles)) {
            redirect(302, "/app?error=No tienes permisos para acceder a esta página.");
        }

        const form = await request.formData();
        const userId = (form.get("userId") as string | null)?.trim();
        const requestedRoles = Array.from(new Set(form.getAll("roles").map((roleId) => String(roleId))));

        if (!userId) {
            return fail(400, { message: "Usuario inválido." });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return fail(404, { message: "El usuario no existe." });
        }

        if (requestedRoles.length > 0) {
            const availableRoles = await prisma.rol.findMany({
                where: {
                    id: {
                        in: requestedRoles,
                    },
                },
                select: {
                    id: true,
                },
            });

            const availableRoleIds = new Set(availableRoles.map((role: { id: string }) => role.id));
            const invalidRole = requestedRoles.find((roleId) => !availableRoleIds.has(roleId));

            if (invalidRole) {
                return fail(400, { message: "Se detectaron roles inválidos." });
            }
        }

        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                roles: {
                    set: requestedRoles.map((roleId) => ({ id: roleId })),
                },
            },
        });

        return {
            success: true,
            message: "Roles actualizados correctamente.",
        };
    },
};
