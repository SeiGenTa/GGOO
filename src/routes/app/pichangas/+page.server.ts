import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { prisma } from "$utils/prisma.js";
import type { Pichanga } from "$generated/prisma/client.js";

export const load: PageServerLoad = async ({ url }) => {
    const page = url.searchParams.get("page");
    if (!page) {
        redirect(302, `/app/pichangas?page=1`);
    }

    return {}
}

export const actions = {
    add_pichanga: async ({ request }) => {
        const form = await request.formData();
        const name = form.get("name-pichanga");
        const date = form.get("date-pichanga");
        const location = form.get("location");
        const admins = form.getAll("admins");
        const max_players = form.get("max_players");
        const habilitar = form.get("habilitar");
        let date_init_register: Date | null = null;
        if (habilitar) {
            date_init_register = new Date();
        }
        else {
            date_init_register = form.get("date-init-register") ? new Date(form.get("date-init-register") as string) : null;
        }

        if (!(date_init_register instanceof Date)) {
            return fail(400, { error: "La fecha de inicio de registro es requerida si no se habilita el registro inmediato" });
        }

        console.log({ name, date, location, admins, max_players, habilitar, date_init_register });

        if (!date || !admins || admins.length === 0 || !max_players || !date_init_register) {
            return fail(
                400,
                {
                    error: `Los siguiente campos son requeridos:
                        ${!date ? "Fecha" : ""}
                        ${!admins || admins.length === 0 ? "Admins" : ""}
                        ${!max_players ? "Maximo de jugadores" : ""}
                        ${habilitar ? "Fecha de inicio de registro" : ""}
                    `
                }
            )
        }

        const datePichanga = new Date(date as string);
        if (datePichanga < new Date()) {
            return fail(400, { error: "La fecha de la pichanga debe ser en el futuro" });
        }
        if (date_init_register && datePichanga < date_init_register) {
            return fail(400, { error: "La fecha de inicio de registro debe ser antes de la fecha de la pichanga" });
        }
        let pichanga: Pichanga | null = null;
        try {
            pichanga = await prisma.pichanga.create({
                data: {
                    nombre: name as string || undefined,
                    lugar: location as string || undefined,
                    fecha: new Date(date as string),
                    admins: {
                        connect: (admins as string[]).map(admin => ({ id: admin }))
                    },
                    maxJugadores: parseInt(max_players as string),
                    fechaInicioIncripcion: date_init_register as Date,
                }
            });
        } catch (error) {
            console.error(error);
            return fail(500, { error: "Error al crear la pichanga" });
        }

        return {
            success: true,
            message: `Pichanga ${name} creada exitosamente con la id ${pichanga.id}`
        }

    }
}