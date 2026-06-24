# Diseño: Notificación por correo al pasar de lista de espera a lista principal

## Contexto

Cuando un usuario se inscribe en una pichanga que ya llegó al límite de `maxJugadores`, queda en la lista de espera. Actualmente no hay forma de que sepa que pasó a la lista principal sin entrar manualmente a la app. Este diseño agrega una notificación automática por correo via Resend.

## Trigger

El único evento que mueve a alguien de la lista de espera a la lista principal es cuando alguien en la **lista principal** ejecuta la acción `salir`. La lista de espera es puramente calculada (no se persiste en BD): son las inscripciones activas ordenadas por `createdAt asc` más allá del índice `maxJugadores`.

Condición exacta para enviar el correo:

- `posicionEnLista <= maxJugadores` — el que salió estaba en la lista principal
- Existe al menos una inscripción activa en posición `maxJugadores + 1` — había lista de espera

## Cambios

### 1. `getPichangaWindow` — agregar `maxJugadores`

```ts
select: {
    fecha: true,
    fechaInicioIncripcion: true,
    maxJugadores: true,   // nuevo
    admins: { select: { id: true } },
}
```

### 2. Acción `salir` — lógica de notificación

Después de calcular `posicionEnLista` y antes de ejecutar el update:

```ts
// Si el que sale estaba en la lista principal, buscar el primero en espera
let candidatoEspera: { user: { email: string; nombre: string } } | null = null
if (posicionEnLista <= pichanga.maxJugadores) {
    const resultado = await prisma.inscripcion.findMany({
        where: { pichangaId: id_pichanga, tiempoSalidaLista: null },
        orderBy: { createdAt: 'asc' },
        skip: pichanga.maxJugadores,
        take: 1,
        select: { user: { select: { email: true, nombre: true } } },
    })
    candidatoEspera = resultado[0] ?? null
}
```

Después del update:

```ts
if (candidatoEspera) {
    const origin = process.env.ORIGIN ?? 'http://localhost:5173'
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
    const pichangaUrl = `${normalizedOrigin}/app/pichangas/stream/${id_pichanga}`
    await sendWaitingListPromotionEmail(
        candidatoEspera.user.email,
        candidatoEspera.user.nombre,
        pichangaUrl
    )
}
```

### 3. Helper de email — definido en el mismo archivo

```ts
const sendWaitingListPromotionEmail = async (
    to: string,
    nombre: string,
    pichangaUrl: string
) => {
    const subject = '¡Pasaste a la lista principal!'
    const html = `
        <p>Hola ${nombre},</p>
        <p>Hay buenas noticias: se liberó un cupo y ahora estás en la <strong>lista principal</strong> de la pichanga.</p>
        <p>Puedes ver tu lugar en la lista aquí:</p>
        <a href="${pichangaUrl}">Ver pichanga</a>
        <p>Si no puedes acceder al enlace, cópialo en tu navegador:</p>
        <p>${pichangaUrl}</p>
        <p>¡Nos vemos en la cancha!</p>
    `
    await sendEmail(to, subject, html)
}
```

## Archivo modificado

- `src/routes/app/pichangas/stream/[id_pichanga]/+page.server.ts`

## Lo que NO cambia

- No hay cambios en BD ni en el schema de Prisma.
- No hay cambios en el frontend.
- El email se dispara de forma fire-and-forget (no bloquea la respuesta del servidor ni retorna error al cliente si falla).

## Logging

Se agrega un `logger.info` con `accion: 'notificacion_lista_espera'` después de enviar el correo, consistente con el patrón de logs existente.
