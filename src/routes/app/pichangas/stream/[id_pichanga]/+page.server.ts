import { prisma } from "$utils/prisma";
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

    console.log("fetching pichanga data", pichanga_data?.fecha.toString());

    if (!pichanga_data) {
        throw new Error("Pichanga no encontrada");
    }

    return {
        name_page: "Lista en tiempo real",
        pichanga: pichanga_data,
    }
}

export const actions = {
    inscribirse: async ({ params, locals }) => {
        console.log("Inscribirse");
        const { id_pichanga } = params;
        const { user } = locals;

        if (!user) {
            throw new Error("Usuario no autenticado");
        }

        await prisma.inscripcion.create({
            data: {
                pichangaId: id_pichanga,
                userId: user.id,
            }
        });
    },
    salir: async ({ params, locals }) => {
        console.log("Salir");
        const { id_pichanga } = params;
        const { user } = locals;

        if (!user) {
            throw new Error("Usuario no autenticado");
        }

        await prisma.inscripcion.deleteMany({
            where: {
                pichangaId: id_pichanga,
                userId: user.id,
            }
        });
    }
}