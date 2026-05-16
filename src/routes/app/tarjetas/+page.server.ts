import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma";

const PAGE_SIZE = 10;

const parsePage = (value: string | null): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1;
    }

    return Math.floor(parsed);
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

const isExpired = (venceEn: Date, usado: boolean): boolean => {
    return !usado && venceEn.getTime() < Date.now();
};

export const load: PageServerLoad = async ({ locals, depends, url }) => {
    depends("app:tarjetas");

    if (!locals.user) {
        throw redirect(302, "/auth");
    }

    const requestedPage = parsePage(url.searchParams.get("page"));

    const where = {
        userId: locals.user.id,
    };

    const totalCards = await prisma.tarjetas.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * PAGE_SIZE;

    const tarjetas = await prisma.tarjetas.findMany({
        where,
        include: {
            reclamosCartas: {
                orderBy: {
                    fechaReclamo: "desc",
                },
                take: 1,
                include: {
                    administradorAtendio: {
                        select: {
                            id: true,
                            nombre: true,
                            apodo: true,
                        },
                    },
                },
            },
            quienAsigno: {
                select: {
                    id: true,
                    nombre: true,
                    apodo: true,
                },
            },
            user: {
                select: {
                    id: true,
                    nombre: true,
                    apodo: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: PAGE_SIZE,
        skip,
    });

    return {
        name_page: "Tarjetas",
        tarjetas: tarjetas.map((tarjeta) => {
            const latestComplaint = tarjeta.reclamosCartas[0] ?? null;

            return {
                id: tarjeta.id,
                tipo: tarjeta.tipoCarta,
                razon: tarjeta.razon,
                usado: tarjeta.usado,
                venceEn: tarjeta.venceEn,
                vencida: isExpired(tarjeta.venceEn, tarjeta.usado),
                createdAt: tarjeta.createdAt,
                assignedBy: tarjeta.quienAsigno
                    ? {
                          id: tarjeta.quienAsigno.id,
                          nombre: tarjeta.quienAsigno.nombre,
                          apodo: tarjeta.quienAsigno.apodo,
                      }
                    : null,
                complaint: latestComplaint
                    ? {
                          id: latestComplaint.id,
                          razon: latestComplaint.razon,
                          fechaReclamo: latestComplaint.fechaReclamo,
                          atendido: latestComplaint.atendido,
                          respuesta: latestComplaint.respuesta,
                          administradorAtendio: latestComplaint.administradorAtendio
                              ? {
                                    id: latestComplaint.administradorAtendio.id,
                                    nombre: latestComplaint.administradorAtendio.nombre,
                                    apodo: latestComplaint.administradorAtendio.apodo,
                                }
                              : null,
                      }
                    : null,
                canComplain: tarjeta.reclamosCartas.length === 0,
            };
        }),
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
    complain: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: "No autorizado." });
        }

        const form = await request.formData();
        const tarjetaId = parseRequiredText(form.get("tarjetaId"));
        const razon = parseRequiredText(form.get("razon"));

        if (!tarjetaId) {
            return fail(400, { message: "Tarjeta inválida." });
        }

        if (razon.length < 3) {
            return fail(400, { message: "La razón del reclamo debe tener al menos 3 caracteres." });
        }

        const tarjeta = await prisma.tarjetas.findFirst({
            where: {
                id: tarjetaId,
                userId: locals.user.id,
            },
            select: {
                id: true,
            },
        });

        if (!tarjeta) {
            return fail(404, { message: "La tarjeta no existe o no te pertenece." });
        }

        const existingComplaint = await prisma.reclamosCarta.findFirst({
            where: {
                tarjetaId,
            },
            select: { id: true },
        });

        if (existingComplaint) {
            return fail(409, { message: "Esta tarjeta ya fue reclamada una vez." });
        }

        await prisma.reclamosCarta.create({
            data: {
                tarjetaId,
                razon,
                fechaReclamo: parseUTCDate(new Date().toISOString()) ?? new Date(),
            },
        });

        return {
            success: true,
            message: "Reclamo enviado correctamente.",
        };
    },
} satisfies Actions;