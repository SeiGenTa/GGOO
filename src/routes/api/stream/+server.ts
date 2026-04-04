import { subscribePichangaStream } from "$lib/server/pichanga-stream";
import { produce } from "sveltekit-sse";

export function GET({ url }: { url: URL }) {
    const pichangaId = url.searchParams.get("id_pichanga");

    return produce(({ emit }) => {
        const { error } = emit("ready", JSON.stringify({ connected: true, pichangaId }));
        if (error) {
            return;
        }

        const unsubscribe = subscribePichangaStream((event) => {
            if (pichangaId && event.pichangaId !== pichangaId) {
                return;
            }

            const { error: emitError } = emit("pichanga-update", JSON.stringify(event));
            if (emitError) {
                unsubscribe();
            }
        });

        return () => {
            unsubscribe();
        };
    });
}