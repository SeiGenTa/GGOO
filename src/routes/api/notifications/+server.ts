import {
    subscribePichangaNotifications,
    type PichangaNotificationEvent,
} from '$lib/server/pichanga-stream'
import { attachPing } from '$lib/server/sse'
import { produce } from 'sveltekit-sse'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ url }) => {
    const pichangaId = url.searchParams.get('id_pichanga')

    return produce(({ emit }) => {
        const { error: readyError } = emit(
            'ready',
            JSON.stringify({ connected: true, pichangaId })
        )
        if (readyError) {
            return
        }

        const stopPing = attachPing(emit)

        const handleNotification = (event: PichangaNotificationEvent) => {
            if (pichangaId && event.pichangaId !== pichangaId) {
                return
            }

            const { error: emitError } = emit(
                'pichanga-notification',
                JSON.stringify(event)
            )
            if (emitError) {
                stopPing()
                unsubscribe()
            }
        }

        const unsubscribe = subscribePichangaNotifications(handleNotification)

        return () => {
            stopPing()
            unsubscribe()
        }
    })
}
