export type PichangaStreamEventType =
    | 'edited'
    | 'joined'
    | 'left'
    | 'deleted'
    | 'opened'

export type PichangaStreamEvent = {
    pichangaId: string
    type: PichangaStreamEventType
    at: string
}

type Listener = (event: PichangaStreamEvent) => void

const listeners = new Set<Listener>()

export const subscribePichangaStream = (listener: Listener) => {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

export const publishPichangaUpdate = (
    pichangaId: string,
    type: PichangaStreamEventType
) => {
    const payload: PichangaStreamEvent = {
        pichangaId,
        type,
        at: new Date().toISOString(),
    }

    for (const listener of listeners) {
        listener(payload)
    }
}

const openTimers = new Map<string, NodeJS.Timeout>()

export const schedulePichangaOpen = (
    pichangaId: string,
    fechaInicioIncripcion: Date
) => {
    const existing = openTimers.get(pichangaId)
    if (existing) {
        clearTimeout(existing)
        openTimers.delete(pichangaId)
    }

    const delay = fechaInicioIncripcion.getTime() - Date.now()
    if (delay <= 0) {
        return
    }

    const timeout = setTimeout(() => {
        openTimers.delete(pichangaId)
        publishPichangaUpdate(pichangaId, 'opened')
    }, delay)

    openTimers.set(pichangaId, timeout)
}

export const cancelPichangaOpen = (pichangaId: string) => {
    const existing = openTimers.get(pichangaId)
    if (existing) {
        clearTimeout(existing)
        openTimers.delete(pichangaId)
    }
}
