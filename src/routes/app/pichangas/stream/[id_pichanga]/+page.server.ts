import { prisma } from "$utils/prisma";
import { fail } from "@sveltejs/kit";
import { publishPichangaUpdate } from "$lib/server/pichanga-stream";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
    const { id_pichanga } = params;

    const pichanga_data = await prisma.pichanga.findUnique({
        where: {
            id: id_pichanga,
        },
        select: {
            id: true,
            nombre: true,
            lugar: true,
            fecha: true,
            fechaInicioIncripcion: true,
            admins: {
                select: {
                    id: true,
                    nombre: true,
                }
            },
            inscripciones: {
                select: {
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    }
                },
                orderBy: {
                    createdAt: "desc",
                }
            },
            maxJugadores: true,
        }
    });

    if (!pichanga_data) {
        throw new Error("Pichanga no encontrada");
    }

    return {
        name_page: "Lista en tiempo real",
        pichanga: pichanga_data,
    }
}

export const actions = {
    editar: async ({ params, request }) => {
        const { id_pichanga } = params;
        const form = await request.formData();
        const name = form.get("name-pichanga");
        const date = form.get("date-pichanga");
        const location = form.get("location");
        const admins = form.getAll("admins");
        const max_players = form.get("max_players");
        const habilitar = form.get("habilitar");
        const date_init_register_input = form.get("date-init-register");

        let date_init_register: Date | null = null;
        if (habilitar === "on") {
            date_init_register = new Date();
        } else if (date_init_register_input) {
            date_init_register = new Date(date_init_register_input.toString());
        }

        if (!date || !admins || admins.length === 0 || !max_players || !date_init_register) {
            return fail(
                400,
                { error: "Todos los campos son requeridos, incluyendo al menos un admin y la fecha de inicio de registro" }
            );
        }

        await prisma.pichanga.update({
            where: {
                id: id_pichanga,
            },
            data: {
                nombre: name?.toString() || undefined,
                fecha: new Date(date.toString()),
                lugar: location?.toString() || undefined,
                maxJugadores: parseInt(max_players.toString()),
                fechaInicioIncripcion: date_init_register,
                admins: {
                    set: (admins as string[]).map(admin => ({ id: admin })),
                },
            }
        });

        publishPichangaUpdate(id_pichanga, "edited");
    },
    inscribirse: async ({ params, locals }) => {
        const { id_pichanga } = params;
        const { user } = locals;

        if (!user) {
            return fail(401, { error: "Usuario no autenticado" });
        }

        const pichanga = await prisma.pichanga.findUnique({
            where: {
                id: id_pichanga,
            },
            select: {
                fechaInicioIncripcion: true,
            }
        })
        if (!pichanga) {
            return fail(404, { error: "Pichanga no encontrada" });
        }

        const now = new Date();
        if (pichanga.fechaInicioIncripcion && now < pichanga.fechaInicioIncripcion) {
            return fail(400, { error: "La inscripción aún no está habilitada" });
        }

        await prisma.inscripcion.create({
            data: {
                pichangaId: id_pichanga,
                userId: user.id,
            }
        });

        publishPichangaUpdate(id_pichanga, "joined");
    },
    salir: async ({ params, locals }) => {
        const { id_pichanga } = params;
        const { user } = locals;

        if (!user) {
            return fail(401, { error: "Usuario no autenticado" });
        }

        await prisma.inscripcion.deleteMany({
            where: {
                pichangaId: id_pichanga,
                userId: user.id,
            }
        });

        publishPichangaUpdate(id_pichanga, "left");
    }
}