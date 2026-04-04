export type PichangaStreamEventType = "edited" | "joined" | "left";

export type PichangaStreamEvent = {
    pichangaId: string;
    type: PichangaStreamEventType;
    at: string;
};

type Listener = (event: PichangaStreamEvent) => void;

const listeners = new Set<Listener>();

export const subscribePichangaStream = (listener: Listener) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

export const publishPichangaUpdate = (pichangaId: string, type: PichangaStreamEventType) => {
    const payload: PichangaStreamEvent = {
        pichangaId,
        type,
        at: new Date().toISOString(),
    };

    for (const listener of listeners) {
        listener(payload);
    }
};
