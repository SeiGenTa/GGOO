/**
 * Buses en memoria para eventos SSE de pichangas.
 *
 * Existen dos canales separados:
 *
 *  - `pichanga-stream`: eventos por partido en vivo (joined, left, edited,
 *    deleted). Consumido por la vista detalle de una pichanga.
 *
 *  - `pichanga-notifications`: notificaciones globales (p.ej. "una pichanga
 *    abrió sus inscripciones"). Consumido por la lista de pichangas y,
 *    opcionalmente, por la vista detalle filtrando por `id_pichanga`.
 */

export type PichangaStreamEventType = 'edited' | 'joined' | 'left' | 'deleted'

export type PichangaStreamEvent = {
    pichangaId: string
    type: PichangaStreamEventType
    at: string
}

type StreamListener = (event: PichangaStreamEvent) => void

const streamListeners = new Set<StreamListener>()

export const subscribePichangaStream = (listener: StreamListener) => {
    streamListeners.add(listener)

    return () => {
        streamListeners.delete(listener)
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

    for (const listener of streamListeners) {
        listener(payload)
    }
}

export type PichangaNotificationType = 'opened'

export type PichangaNotificationEvent = {
    pichangaId: string
    type: PichangaNotificationType
    at: string
}

type NotificationListener = (event: PichangaNotificationEvent) => void

const notificationListeners = new Set<NotificationListener>()

export const subscribePichangaNotifications = (
    listener: NotificationListener
) => {
    notificationListeners.add(listener)

    return () => {
        notificationListeners.delete(listener)
    }
}

export const publishPichangaNotification = (
    pichangaId: string,
    type: PichangaNotificationType
) => {
    const payload: PichangaNotificationEvent = {
        pichangaId,
        type,
        at: new Date().toISOString(),
    }

    for (const listener of notificationListeners) {
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
        publishPichangaNotification(pichangaId, 'opened')
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
