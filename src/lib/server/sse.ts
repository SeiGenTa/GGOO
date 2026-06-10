/**
 * Helpers compartidos para endpoints SSE.
 *
 * Mantiene un único origen de verdad para el intervalo de ping, que
 * todos los endpoints deben respetar.
 */

export const PING_INTERVAL_MS = 20_000

export type SSEEmitter = (event: string, data: string) => { error?: unknown }

/**
 * Programa un `setInterval` que emite un evento `ping` con timestamp
 * ISO. Devuelve una función de cleanup que detiene el intervalo.
 *
 * Si el `emit` falla (cliente desconectado), el intervalo se cancela
 * automáticamente.
 */
export const attachPing = (emit: SSEEmitter): (() => void) => {
    const interval = setInterval(() => {
        const { error } = emit(
            'ping',
            JSON.stringify({ at: new Date().toISOString() })
        )
        if (error) {
            clearInterval(interval)
        }
    }, PING_INTERVAL_MS)

    return () => {
        clearInterval(interval)
    }
}
