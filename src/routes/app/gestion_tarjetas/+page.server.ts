import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { Permissions } from "../../../lib/permissions";
import { prisma } from "$utils/prisma";
import type { Prisma } from "$generated/prisma/client";

const PAGE_SIZE = 10;
const CARD_TYPES = ["roja", "amarilla"] as const;
const ORDERABLE_FIELDS = ["createdAt", "tipoCarta", "usado", "venceEn"] as const;

type CardType = (typeof CARD_TYPES)[number];
type OrderableField = (typeof ORDERABLE_FIELDS)[number];

const parsePage = (value: string | null): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1;
    }

    return Math.floor(parsed);
};

const parseCardType = (value: string | null): CardType | null => {
    if (!value) {
        return null;
    }

    if (CARD_TYPES.includes(value as CardType)) {
        return value as CardType;
    }

    return null;
};

const parseUsadoFilter = (value: string | null): boolean | null => {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return null;
};

const parseOrderBy = (value: string | null): OrderableField => {
    if (value && ORDERABLE_FIELDS.includes(value as OrderableField)) {
        return value as OrderableField;
    }

    return "createdAt";
};

const parseOrderDir = (value: string | null): "asc" | "desc" => {
    if (value === "asc" || value === "desc") {
        return value;
    }

    return "desc";
};

const parseRequiredText = (value: FormDataEntryValue | null): string => {
    return typeof value === "string" ? value.trim() : "";
};

const parseUTCDate = (value: string | null): Date | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};

const plusOneMonthUTC = (base: Date): Date => {
    const result = new Date(base);
    result.setUTCMonth(result.getUTCMonth() + 1);
    return result;
};

export const load: PageServerLoad = async ({ locals, depends, url }) => {
    depends("app:gestion_tarjetas");

    if (!locals.user) {
        throw redirect(302, "/auth");
    }

    if (!locals.user.permisos.includes(Permissions.VerTarjetas)) {
        throw redirect(302, "/app?error=No tienes permisos para acceder a esta página.");
    }

    const q = (url.searchParams.get("q") ?? "").trim();
    const userIds = url.searchParams
        .getAll("userId")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    const assignedByIds = url.searchParams
        .getAll("assignedById")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    const tipo = parseCardType(url.searchParams.get("tipo"));
    const usado = parseUsadoFilter(url.searchParams.get("usado"));
    const venceEnDesdeRaw = url.searchParams.get("venceEnDesde");
    const venceEnHastaRaw = url.searchParams.get("venceEnHasta");
    const venceEnDesde = parseUTCDate(venceEnDesdeRaw);
    const venceEnHasta = parseUTCDate(venceEnHastaRaw);
    const orderBy = parseOrderBy(url.searchParams.get("orderBy"));
    const orderDir = parseOrderDir(url.searchParams.get("orderDir"));

    const requestedPage = parsePage(url.searchParams.get("page"));

    const where: Prisma.TarjetasWhereInput = {};

    if (q.length > 0) {
        where.OR = [
            { id: { contains: q, mode: "insensitive" } },
            { tipoCarta: { contains: q, mode: "insensitive" } },
            { razon: { contains: q, mode: "insensitive" } },
            { user: { nombre: { contains: q, mode: "insensitive" } } },
            { quienAsigno: { nombre: { contains: q, mode: "insensitive" } } },
        ];
    }

    if (userIds.length > 0) {
        where.userId = { in: userIds };
    }

    if (assignedByIds.length > 0) {
        where.quienAsignoId = { in: assignedByIds };
    }

    if (tipo) {
        where.tipoCarta = tipo;
    }

    if (typeof usado === "boolean") {
        where.usado = usado;
    }

    if (venceEnDesde || venceEnHasta) {
        where.venceEn = {
            gte: venceEnDesde ?? undefined,
            lte: venceEnHasta ?? undefined,
        };
    }

    const totalCards = await prisma.tarjetas.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * PAGE_SIZE;

    const [tarjetas, users] = await Promise.all([
        prisma.tarjetas.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                    },
                },
                quienAsigno: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                [orderBy]: orderDir,
            },
            take: PAGE_SIZE,
            skip,
        }),
        prisma.user.findMany({
            select: {
                id: true,
                apodo: true,
                nombre: true,
                email: true,
            },
            orderBy: {
                nombre: "asc",
            },
        }),
    ]);

    return {
        name_page: "Gestión de tarjetas",
        cardTypes: [...CARD_TYPES],
        tarjetas: tarjetas.map((tarjeta) => ({
            id: tarjeta.id,
            userId: tarjeta.userId,
            quienAsignoId: tarjeta.quienAsignoId,
            persona: tarjeta.user?.nombre ?? "Usuario no encontrado",
            personaEmail: tarjeta.user?.email ?? null,
            asignadoPor: tarjeta.quienAsigno?.nombre ?? "Usuario no encontrado",
            asignadoPorEmail: tarjeta.quienAsigno?.email ?? null,
            tipo: tarjeta.tipoCarta,
            razon: tarjeta.razon,
            fechaCreacion: tarjeta.createdAt,
            venceEn: tarjeta.venceEn,
            usado: tarjeta.usado,
            vencida: !tarjeta.usado && tarjeta.venceEn.getTime() < Date.now(),
        })),
        userOptions: users,
        canCreate: locals.user.permisos.includes(Permissions.CrearTarjetas),
        canEdit: locals.user.permisos.includes(Permissions.EditarTarjetas),
        canDelete: locals.user.permisos.includes(Permissions.EliminarTarjetas),
        filters: {
            q,
            userIds,
            assignedByIds,
            tipo: tipo ?? "",
            usado: url.searchParams.get("usado") ?? "",
            venceEnDesde: venceEnDesdeRaw ?? "",
            venceEnHasta: venceEnHastaRaw ?? "",
            orderBy,
            orderDir,
        },
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            totalItems: totalCards,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
    };
};

export const actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        if (!locals.user.permisos.includes(Permissions.CrearTarjetas)) {
            return fail(403, { message: "No tienes permisos para crear tarjetas." });
        }

        const form = await request.formData();
        const id_personas = parseRequiredText(form.get("id_personas"));
        const tipo = parseCardType(parseRequiredText(form.get("tipo")));
        const razon = parseRequiredText(form.get("razon"));
        const venceEnRaw = parseRequiredText(form.get("venceEn"));

        if (!id_personas) {
            return fail(400, { message: "Debes seleccionar una persona." });
        }

        if (!tipo) {
            return fail(400, { message: "El tipo de tarjeta no es válido." });
        }

        if (razon.length < 3) {
            return fail(400, { message: "La razón debe tener al menos 3 caracteres." });
        }

        const venceEn = venceEnRaw.length > 0
            ? parseUTCDate(venceEnRaw)
            : plusOneMonthUTC(new Date());

        if (!venceEn) {
            return fail(400, { message: "La fecha de vencimiento no es válida." });
        }

        const userExists = await prisma.user.findUnique({
            where: { id: id_personas },
            select: { id: true },
        });

        if (!userExists) {
            return fail(404, { message: "La persona seleccionada no existe." });
        }

        await prisma.tarjetas.create({
            data: {
                userId: id_personas,
                tipoCarta: tipo,
                razon,
                usado: false,
                quienAsignoId: locals.user.id,
                venceEn,
            },
        });

        return {
            success: true,
            message: "Tarjeta creada correctamente.",
        };
    },

    delete: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        if (!locals.user.permisos.includes(Permissions.EliminarTarjetas)) {
            return fail(403, { message: "No tienes permisos para eliminar tarjetas." });
        }

        const form = await request.formData();
        const id_tarjeta = parseRequiredText(form.get("id_tarjeta"));

        if (!id_tarjeta) {
            return fail(400, { message: "Debes indicar la tarjeta a eliminar." });
        }

        const exists = await prisma.tarjetas.findUnique({
            where: { id: id_tarjeta },
            select: { id: true },
        });

        if (!exists) {
            return fail(404, { message: "La tarjeta no existe." });
        }

        await prisma.$transaction([
            prisma.reclamosCarta.deleteMany({ where: { tarjetaId: id_tarjeta } }),
            prisma.tarjetas.delete({ where: { id: id_tarjeta } }),
        ]);

        return {
            success: true,
            message: "Tarjeta eliminada correctamente.",
        };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        if (!locals.user.permisos.includes(Permissions.EditarTarjetas)) {
            return fail(403, { message: "No tienes permisos para editar tarjetas." });
        }

        const form = await request.formData();
        const id_tarjeta = parseRequiredText(form.get("id_tarjeta"));
        const tipoRaw = parseRequiredText(form.get("tipo"));
        const usadoRaw = parseRequiredText(form.get("usado"));
        const venceEnRaw = parseRequiredText(form.get("venceEn"));

        if (!id_tarjeta) {
            return fail(400, { message: "Debes indicar la tarjeta a actualizar." });
        }

        const data: Prisma.TarjetasUpdateInput = {};

        if (tipoRaw.length > 0) {
            const tipo = parseCardType(tipoRaw);
            if (!tipo) {
                return fail(400, { message: "El tipo de tarjeta no es válido." });
            }
            data.tipoCarta = tipo;
        }

        if (usadoRaw.length > 0) {
            if (usadoRaw !== "true" && usadoRaw !== "false") {
                return fail(400, { message: "El valor de 'usado' no es válido." });
            }
            data.usado = usadoRaw === "true";
        }

        if (venceEnRaw.length > 0) {
            const venceEn = parseUTCDate(venceEnRaw);
            if (!venceEn) {
                return fail(400, { message: "La fecha de vencimiento no es válida." });
            }
            data.venceEn = venceEn;
        }

        if (Object.keys(data).length === 0) {
            return fail(400, { message: "No hay datos para actualizar." });
        }

        try {
            await prisma.tarjetas.update({
                where: { id: id_tarjeta },
                data,
            });
        } catch {
            return fail(404, { message: "La tarjeta no existe o no pudo actualizarse." });
        }

        return {
            success: true,
            message: "Tarjeta actualizada correctamente.",
        };
    },
} satisfies Actions;