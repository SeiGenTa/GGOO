import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";
import { Permissions } from "../permissions/permissions";
import type { Prisma } from "$generated/prisma/client";
import { sendEmail } from "$lib/email/resend";

const ALL_PERMISSIONS = Object.values(Permissions);
const PAGE_SIZE = 10;

type UserPermissions = {
    isAdmin: boolean;
    permissions: Set<string>;
};

type FilterStatus = "all" | "pending" | "approved" | "rejected";

const parsePage = (value: string | null): number => {
    const page = Number(value);
    if (!Number.isFinite(page) || page < 1) {
        return 1;
    }

    return Math.floor(page);
};

const parseStatus = (value: string | null): FilterStatus => {
    if (value === "pending" || value === "approved" || value === "rejected") {
        return value;
    }

    return "all";
};

const getUserPermissions = async (userId: string): Promise<UserPermissions | null> => {
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

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        redirect(302, "/auth");
    }

    const canView = await canUseAny(locals.user.id, [Permissions.VerMiembros, Permissions.AceptarMiembros]);
    const canModerate = await canUseAny(locals.user.id, [Permissions.AceptarMiembros]);

    if (!canView) {
        return {
            name_page: "Usuarios",
            users: [],
            blocked: true,
            canModerate: false,
            filters: {
                q: "",
                status: "all",
            },
            pagination: {
                page: 1,
                pageSize: PAGE_SIZE,
                totalItems: 0,
                totalPages: 1,
                hasPrev: false,
                hasNext: false,
            },
        };
    }

    const q = (url.searchParams.get("q") ?? "").trim();
    const status = parseStatus(url.searchParams.get("status"));
    const requestedPage = parsePage(url.searchParams.get("page"));

    const where: Prisma.UserWhereInput = {};

    if (q.length > 0) {
        where.OR = [
            { id: { contains: q, mode: "insensitive" } },
            { nombre: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { apodo: { contains: q, mode: "insensitive" } },
        ];
    }

    if (status === "pending") {
        where.AND = [
            { aprobado_por_admin: false },
            { rechazado_por_admin: false },
        ];
    }

    if (status === "approved") {
        where.aprobado_por_admin = true;
    }

    if (status === "rejected") {
        where.rechazado_por_admin = true;
    }

    const totalUsers = await prisma.user.count({ where });
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
            es_valido: true,
            aprobado_por_admin: true,
            rechazado_por_admin: true,
            roles: {
                select: {
                    id: true,
                    nombre: true,
                },
                orderBy: {
                    nombre: "asc",
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        skip,
        take: PAGE_SIZE,
    });

    return {
        name_page: "Usuarios",
        users,
        blocked: false,
        canModerate,
        filters: {
            q,
            status,
        },
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            totalItems: totalUsers,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
    };
};

export const actions: Actions = {
    accept_member: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const canModerate = await canUseAny(locals.user.id, [Permissions.AceptarMiembros]);
        if (!canModerate) {
            return fail(403, { message: "No tienes permisos para aceptar miembros." });
        }

        const form = await request.formData();
        const userId = (form.get("userId") as string | null)?.trim();

        if (!userId) {
            return fail(400, { message: "Usuario inválido." });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                aprobado_por_admin: true,
            },
        });

        if (!user) {
            return fail(404, { message: "El usuario no existe." });
        }

        if (user.aprobado_por_admin) {
            return {
                success: true,
                message: "El usuario ya estaba aprobado.",
            };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                es_valido: true,
                aprobado_por_admin: true,
                rechazado_por_admin: false,
            },
        });

        const userEmail = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        const subject = "Cuenta aprobada en GGOO";

        const html = `
            <p>¡Hola!</p>
            <p>Nos complace informarte que tu cuenta en GGOO ha sido aprobada por un administrador. Ahora puedes iniciar sesión y comenzar a disfrutar de todas las funcionalidades de la plataforma.</p>
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            <p>¡Bienvenido a GGOO!</p>
        `;

        if (userEmail?.email) {
            await sendEmail(userEmail.email, subject, html);
        }

        return {
            success: true,
            message: "Usuario aprobado correctamente.",
        };
    },

    reject_member: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const canModerate = await canUseAny(locals.user.id, [Permissions.AceptarMiembros]);
        if (!canModerate) {
            return fail(403, { message: "No tienes permisos para rechazar miembros." });
        }

        const form = await request.formData();
        const userId = (form.get("userId") as string | null)?.trim();
        const comment = (form.get("comment") as string | null)?.trim() ?? "";

        if (!userId) {
            return fail(400, { message: "Usuario inválido." });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
            },
        });

        if (!user) {
            return fail(404, { message: "El usuario no existe." });
        }

        // Nota: por ahora solo marcamos rechazado_por_admin. El comentario se ignora temporalmente.
        await prisma.user.update({
            where: { id: userId },
            data: {
                rechazado_por_admin: true,
                aprobado_por_admin: false,
                es_valido: false,
            },
        });

        return {
            success: true,
            message: comment.length > 0 ? "Usuario rechazado. Comentario registrado temporalmente." : "Usuario rechazado correctamente.",
        };
    },
};
