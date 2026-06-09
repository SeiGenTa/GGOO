<script lang="ts">
    import { invalidateAll, goto } from '$app/navigation'
    import { enhance } from '$app/forms'
    import InputApp from '$lib/components/app/input.svelte'
    import SelectApp from '$lib/components/app/select.svelte'
    import Badge from '$lib/components/ui/badge/badge.svelte'
    import Button from '$lib/components/ui/button/button.svelte'
    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Item from '$lib/components/ui/item'
    import Label from '$lib/components/ui/label/label.svelte'
    import Separator from '$lib/components/ui/separator/separator.svelte'
    import { Spinner } from '$lib/components/ui/spinner'
    import { page } from '$app/state'
    import { onMount } from 'svelte'
    import { toast } from 'svelte-sonner'
    import Skeleton from './components/skeleton.svelte'

    let { data } = $props()

    // ── Captura local: skeleton solo en primera carga ──
    let pichanga: any = $state(null)
    let pichangaLoading = $state(true)
    let pichangaError: string | null = $state(null)

    $effect(() => {
        data.pichanga
            .then((result) => {
                pichanga = result
                pichangaError = null
            })
            .catch((err) => {
                pichangaError =
                    err instanceof Error ? err.message : 'Error desconocido'
            })
            .finally(() => {
                pichangaLoading = false
            })
    })
    // ─────────────────────────────────────────

    let open_edit = $state(false)
    let loading_edit = $state(false)
    let options_admins: { value: string; label: string }[] = $state([])
    let selected_admins: string[] = $state([])
    let switch_init_now = $state(false)
    let loading_join = $state(false)
    let loading_leave = $state(false)
    let open_leave_confirm = $state(false)

    // Sincroniza el formulario de edición con la pichanga cargada y
    // lo resetea cada vez que se abre el diálogo.
    $effect(() => {
        if (open_edit && pichanga) {
            selected_admins = pichanga.admins.map((a: { id: string }) => a.id)
            const fechaInscripcion = new Date(pichanga.fechaInicioIncripcion)
            const ahora = new Date()
            // Si la fecha de inscripción está a menos de 1 minuto del "ahora",
            // interpretamos que equivale a "habilitar ahora".
            switch_init_now =
                Math.abs(fechaInscripcion.getTime() - ahora.getTime()) < 60_000
        }
    })

    const user_id = $derived(data.user?.id ?? '')

    // Helpers para operar en horario de Chile (UTC-3/-4 con cambio DST
    // manejado por el navegador vía timeZone: 'America/Santiago').
    const chileDateTimeParts = (date: string | Date) => {
        const d = new Date(date)
        if (Number.isNaN(d.getTime())) {
            return null
        }

        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santiago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })

        const parts = fmt
            .formatToParts(d)
            .reduce<Record<string, string>>((acc, part) => {
                if (part.type !== 'literal') {
                    acc[part.type] = part.value
                }
                return acc
            }, {})

        return {
            year: Number(parts.year),
            month: Number(parts.month),
            day: Number(parts.day),
            hour: Number(parts.hour),
            minute: Number(parts.minute),
            dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        }
    }

    // El diálogo de "salir" sólo se habilita desde las 08:00 hora Chile
    // del día de la pichanga. Antes de ese momento el usuario no puede
    // abandonar la lista.
    const puede_confirmar_salida = $derived.by(() => {
        if (!pichanga) return false

        const now = chileDateTimeParts(new Date())
        const partido = chileDateTimeParts(pichanga.fecha)
        if (!now || !partido) return false

        const mismoDia =
            now.year === partido.year &&
            now.month === partido.month &&
            now.day === partido.day

        if (!mismoDia) {
            // Si el partido es hoy, el día coincide; si es otro día, todavía
            // no se cumple la condición. Si el partido ya pasó, se permite
            // (caso borde que el server igual bloqueará por la ventana).
            return now.dateKey > partido.dateKey
        }

        const minutosNow = now.hour * 60 + now.minute
        return minutosNow >= 8 * 60
    })

    const toDateTimeLocal = (date: string | Date) => {
        const d = new Date(date)
        if (Number.isNaN(d.getTime())) return ''
        const pad = (value: number) => value.toString().padStart(2, '0')

        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    onMount(() => {
        const eventSource = new EventSource(
            `/api/stream?id_pichanga=${encodeURIComponent(page.params.id_pichanga!)}`
        )

        const handlePichangaUpdate = async (event: any) => {
            const eventData = JSON.parse(event.data)
            const type = eventData.type
            if (type === 'deleted') {
                await goto(
                    '/app/pichangas?error=La pichanga fue eliminada&page=1'
                )
                return
            }
            await invalidateAll()
        }

        const init = async () => {
            const data_users: {
                user: { id: string; nombre: string }[]
            } = await fetch('/api/user?select=id&select=nombre', {
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then((res) => res.json())

            options_admins = data_users.user.map((u) => ({
                value: u.id,
                label: u.nombre,
            }))
        }

        eventSource.addEventListener('pichanga-update', handlePichangaUpdate)
        eventSource.onerror = () => {
            eventSource.close()
        }

        void init()

        return () => {
            eventSource.removeEventListener(
                'pichanga-update',
                handlePichangaUpdate
            )
            eventSource.close()
        }
    })
</script>

{#if pichangaLoading}
    <Skeleton />
{:else if pichangaError}
    <div class="min-h-full rounded-2xl sm:p-5 flex items-center justify-center">
        <div class="text-center space-y-3">
            <p class="text-lg font-semibold text-destructive">
                Error al cargar la pichanga
            </p>
            <p class="text-sm text-muted-foreground">{pichangaError}</p>
            <a href="/app/pichangas" class="text-sm underline text-primary"
                >Volver a pichangas</a
            >
        </div>
    </div>
{:else if pichanga}
    {@const inscripciones_activas = pichanga.inscripciones.filter(
        (i: { tiempoSalidaLista: string | null }) => !i.tiempoSalidaLista
    )}
    {@const inscripciones_salieron = [...pichanga.inscripciones]
        .filter(
            (i: { tiempoSalidaLista: string | null }) => i.tiempoSalidaLista
        )
        .sort(
            (a, b) =>
                new Date(b.tiempoSalidaLista ?? 0).getTime() -
                new Date(a.tiempoSalidaLista ?? 0).getTime()
        )}
    {@const inscrito = user_id
        ? inscripciones_activas.some(
              (i: { user: { id: string } }) => i.user.id === user_id
          )
        : false}
    {@const admin_partido = user_id
        ? pichanga.admins.some((a: { id: string }) => a.id === user_id)
        : false}
    {@const inscripciones_abierta =
        new Date() >= new Date(pichanga.fechaInicioIncripcion) &&
        new Date() < new Date(pichanga.fecha)}
    {@const evento_finalizado = new Date() >= new Date(pichanga.fecha)}
    {@const inscritos = inscripciones_activas.slice(0, pichanga.maxJugadores)}
    {@const lista_espera = inscripciones_activas.slice(pichanga.maxJugadores)}
    <div class="min-h-full rounded-2xl sm:p-5">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card.Root class="lg:col-span-2 border-slate-200/70 shadow-lg">
                <Card.Header class="space-y-3">
                    <div
                        class="flex flex-wrap items-start justify-between gap-2"
                    >
                        <div>
                            <Card.Title class="text-lg sm:text-xl"
                                >{pichanga.nombre ??
                                    `Pichanga del ${new Date(pichanga.fecha).toLocaleDateString('es-CL')}`}</Card.Title
                            >
                            <p class="text-xs text-muted-foreground sm:text-sm">
                                Panel de datos del partido
                            </p>
                        </div>

                        <Badge
                            variant={inscritos.length >= pichanga.maxJugadores
                                ? 'destructive'
                                : 'default'}
                        >
                            {inscritos.length}/{pichanga.maxJugadores} cupos
                        </Badge>
                    </div>

                    <Card.Action class="flex w-full flex-wrap gap-2">
                        {#if data.user?.es_admin}
                            <Dialog.Root>
                                <Dialog.Trigger>
                                    {#snippet child({ props })}
                                        <Button
                                            {...props}
                                            class="cursor-pointer"
                                            variant="destructive"
                                            size="sm">Eliminar</Button
                                        >
                                    {/snippet}
                                </Dialog.Trigger>
                                <Dialog.Content>
                                    <Dialog.Header>
                                        <Dialog.Title
                                            >¿Eliminar esta pichanga?</Dialog.Title
                                        >
                                        <Dialog.Description
                                            >Esta acción no se puede deshacer.</Dialog.Description
                                        >
                                    </Dialog.Header>
                                    <Dialog.Footer class="space-x-2">
                                        <Dialog.Close>Cancelar</Dialog.Close>
                                        <form
                                            method="POST"
                                            action="?/eliminar"
                                            use:enhance
                                        >
                                            <input
                                                type="hidden"
                                                name="id-pichanga"
                                                value={pichanga.id}
                                            />
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                >Eliminar</Button
                                            >
                                        </form>
                                    </Dialog.Footer>
                                </Dialog.Content>
                            </Dialog.Root>
                            <Dialog.Root bind:open={open_edit}>
                                <Dialog.Trigger>
                                    {#snippet child({ props })}
                                        <Button
                                            {...props}
                                            class="cursor-pointer"
                                            variant="outline"
                                            size="sm">Editar</Button
                                        >
                                    {/snippet}
                                </Dialog.Trigger>
                                <Dialog.DialogContent>
                                    <Dialog.Header>
                                        <Dialog.Title
                                            >Editar pichanga</Dialog.Title
                                        >
                                    </Dialog.Header>

                                    <form
                                        id="form-edit"
                                        method="POST"
                                        action="?/editar"
                                        class="space-y-4"
                                        use:enhance={({ formData }) => {
                                            loading_edit = true

                                            const date_pichanga = formData.get(
                                                'date-pichanga'
                                            ) as string
                                            if (date_pichanga) {
                                                formData.set(
                                                    'date-pichanga',
                                                    new Date(
                                                        date_pichanga
                                                    ).toISOString()
                                                )
                                            }

                                            const date_init_register =
                                                formData.get(
                                                    'date-init-register'
                                                ) as string
                                            if (
                                                date_init_register &&
                                                !formData.get('habilitar')
                                            ) {
                                                formData.set(
                                                    'date-init-register',
                                                    new Date(
                                                        date_init_register
                                                    ).toISOString()
                                                )
                                            }

                                            return async ({
                                                result,
                                                update,
                                            }) => {
                                                loading_edit = false

                                                if (result.type === 'success') {
                                                    toast(
                                                        'Pichanga actualizada',
                                                        {
                                                            description:
                                                                'Los cambios se guardaron correctamente.',
                                                        }
                                                    )
                                                    open_edit = false
                                                    await update()
                                                }

                                                if (result.type === 'failure') {
                                                    toast(
                                                        'No fue posible guardar',
                                                        {
                                                            description:
                                                                (
                                                                    result.data as any
                                                                ).error ??
                                                                'Revisa los datos del formulario.',
                                                        }
                                                    )
                                                }
                                            }
                                        }}
                                    >
                                        <InputApp
                                            id="name"
                                            name="name-pichanga"
                                            label="Nombre de la pichanga"
                                            placeholder="Pichanga del sábado"
                                            value={pichanga.nombre ?? ''}
                                        />

                                        <InputApp
                                            id="date"
                                            name="date-pichanga"
                                            label="Fecha y hora de la pichanga"
                                            type="datetime-local"
                                            required
                                            value={toDateTimeLocal(
                                                pichanga.fecha
                                            )}
                                        />

                                        <SelectApp
                                            name="admins"
                                            label="Admins"
                                            type="multiple"
                                            options={options_admins}
                                            placeholder="Selecciona admins"
                                            bind:value={selected_admins}
                                        />

                                        <InputApp
                                            id="location"
                                            name="location"
                                            label="Ubicación"
                                            placeholder="Cancha central"
                                            value={pichanga.lugar ?? ''}
                                        />

                                        <InputApp
                                            id="max_players"
                                            name="max_players"
                                            label="Número máximo de jugadores"
                                            type="number"
                                            value={pichanga.maxJugadores.toString()}
                                            required
                                        />

                                        <InputApp
                                            id="date-init_register"
                                            name="date-init-register"
                                            label="Fecha de inicio de inscripción"
                                            type="datetime-local"
                                            value={toDateTimeLocal(
                                                pichanga.fechaInicioIncripcion
                                            )}
                                            disabled={switch_init_now}
                                            required={!switch_init_now}
                                        />

                                        <div
                                            class="flex items-center gap-2 rounded-lg border p-3"
                                        >
                                            <input
                                                type="hidden"
                                                name="habilitar"
                                                value="off"
                                            />
                                            <input
                                                id="habilitar"
                                                type="checkbox"
                                                name="habilitar"
                                                value="on"
                                                bind:checked={switch_init_now}
                                                class="size-4 cursor-pointer accent-primary"
                                            />
                                            <Label for="habilitar"
                                                >Habilitar inscripciones ahora</Label
                                            >
                                        </div>
                                    </form>

                                    <Dialog.Footer>
                                        <Dialog.Close>Cancelar</Dialog.Close>
                                        <Button
                                            type="submit"
                                            form="form-edit"
                                            disabled={loading_edit}
                                            >Guardar cambios</Button
                                        >
                                    </Dialog.Footer>
                                </Dialog.DialogContent>
                            </Dialog.Root>
                        {/if}

                        {#if !admin_partido && data.user}
                            {#if inscrito}
                                {#if inscripciones_abierta}
                                    <Dialog.Root bind:open={open_leave_confirm}>
                                        <Dialog.Trigger>
                                            {#snippet child({ props })}
                                                <Button
                                                    {...props}
                                                    class="cursor-pointer"
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Salir
                                                </Button>
                                            {/snippet}
                                        </Dialog.Trigger>
                                        <Dialog.Content>
                                            <Dialog.Header>
                                                <Dialog.Title
                                                    >¿Salir de la pichanga?</Dialog.Title
                                                >
                                                <Dialog.Description>
                                                    {#if puede_confirmar_salida}
                                                        ¿Estás seguro que
                                                        quieres salir? Perderás
                                                        tu lugar en la lista y
                                                        <span
                                                            class="font-semibold text-destructive"
                                                            >te arriesgas a
                                                            recibir una tarjeta</span
                                                        >.
                                                    {:else}
                                                        ¿Estás seguro que
                                                        quieres salir? Perderás
                                                        tu lugar en la lista.
                                                    {/if}
                                                </Dialog.Description>
                                            </Dialog.Header>
                                            <Dialog.Footer class="space-x-2">
                                                <Dialog.Close
                                                    >Cancelar</Dialog.Close
                                                >
                                                <form
                                                    id="form-leave"
                                                    method="POST"
                                                    action="?/salir"
                                                    use:enhance={() => {
                                                        loading_leave = true
                                                        open_leave_confirm = false
                                                        return async ({
                                                            result,
                                                            update,
                                                        }) => {
                                                            loading_leave = false
                                                            if (
                                                                result.type ===
                                                                'success'
                                                            ) {
                                                                await update()
                                                            }
                                                            if (
                                                                result.type ===
                                                                'failure'
                                                            ) {
                                                                toast(
                                                                    'No se pudo salir',
                                                                    {
                                                                        description:
                                                                            (
                                                                                result.data as any
                                                                            )
                                                                                .error ??
                                                                            'Intenta nuevamente.',
                                                                    }
                                                                )
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Button
                                                        type="submit"
                                                        variant="destructive"
                                                        disabled={loading_leave}
                                                    >
                                                        {#if loading_leave}
                                                            <Spinner
                                                                class="mr-1"
                                                            />
                                                            Saliendo...
                                                        {:else}
                                                            Sí, salir
                                                        {/if}
                                                    </Button>
                                                </form>
                                            </Dialog.Footer>
                                        </Dialog.Content>
                                    </Dialog.Root>
                                {:else}
                                    <Badge variant="secondary"
                                        >Solo lectura</Badge
                                    >
                                {/if}
                            {:else if inscripciones_abierta}
                                <form
                                    method="POST"
                                    action="?/inscribirse"
                                    use:enhance={() => {
                                        loading_join = true
                                        return async ({ result, update }) => {
                                            loading_join = false
                                            if (result.type === 'success') {
                                                await update()
                                            }
                                            if (result.type === 'failure') {
                                                toast('No se pudo unir', {
                                                    description:
                                                        (result.data as any)
                                                            .error ??
                                                        'Intenta nuevamente.',
                                                })
                                            }
                                        }
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="default"
                                        size="sm"
                                        disabled={loading_join}
                                    >
                                        {#if loading_join}
                                            <Spinner class="mr-1" />
                                            Uniéndose...
                                        {:else}
                                            Unirse
                                        {/if}
                                    </Button>
                                </form>
                            {:else}
                                <Badge variant="secondary"
                                    >{evento_finalizado
                                        ? 'Evento finalizado'
                                        : 'Inscripciones cerradas'}</Badge
                                >
                            {/if}
                        {/if}
                    </Card.Action>
                </Card.Header>

                <Separator />

                <Card.Content class="space-y-3">
                    <Item.Root variant="default" class="rounded-xl border">
                        <Item.Header>
                            <Item.Title>Admins</Item.Title>
                        </Item.Header>
                        <Item.Content class="flex flex-wrap gap-2">
                            {#each pichanga.admins as admin}
                                <Badge variant="outline">{admin.nombre}</Badge>
                            {/each}
                        </Item.Content>
                    </Item.Root>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Item.Root variant="default" class="rounded-xl border ">
                            <Item.Header>
                                <Item.Title>Fecha del partido</Item.Title>
                            </Item.Header>
                            <Item.Content>
                                <div class="text-sm font-medium">
                                    {new Date(pichanga.fecha).toLocaleString(
                                        'es-CL'
                                    )}
                                </div>
                            </Item.Content>
                        </Item.Root>

                        <Item.Root variant="default" class="rounded-xl border ">
                            <Item.Header>
                                <Item.Title>Inicio de inscripción</Item.Title>
                            </Item.Header>
                            <Item.Content>
                                <div class="text-sm font-medium">
                                    {new Date(
                                        pichanga.fechaInicioIncripcion
                                    ).toLocaleString('es-CL')}
                                </div>
                            </Item.Content>
                        </Item.Root>
                    </div>

                    <Item.Root variant="default" class="rounded-xl border ">
                        <Item.Header>
                            <Item.Title>Ubicación</Item.Title>
                        </Item.Header>
                        <Item.Content>
                            <div class="text-sm">
                                {pichanga.lugar ?? 'Por definir'}
                            </div>
                        </Item.Content>
                    </Item.Root>
                </Card.Content>
            </Card.Root>

            <Card.Root class="lg:col-span-3 border-slate-200/70 shadow-lg">
                <Card.Header class="space-y-1">
                    <Card.Title class="text-lg sm:text-xl"
                        >Inscripciones en vivo</Card.Title
                    >
                    <p class="text-xs text-muted-foreground sm:text-sm">
                        El orden se mantiene por hora de registro.
                    </p>
                </Card.Header>

                <Card.Content class="space-y-5">
                    <section>
                        <div class="mb-2 flex items-center justify-between">
                            <h2 class="text-base font-semibold">Lista</h2>
                            <Badge variant="secondary">{inscritos.length}</Badge
                            >
                        </div>

                        {#if inscritos.length > 0}
                            <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {#each inscritos as inscripcion, index}
                                    <li
                                        class="rounded-lg border bg-background/80 px-3 py-2 text-sm space-x-1 font-medium"
                                    >
                                        <span class="text-muted-foreground"
                                            >{index + 1}.</span
                                        >
                                        {inscripcion.user.apodo
                                            ? inscripcion.user.apodo
                                            : inscripcion.user.nombre}
                                        {#if inscripcion.user.apodo}
                                            <Badge variant="secondary"
                                                >{inscripcion.user
                                                    .nombre}</Badge
                                            >
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <p
                                class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                            >
                                No hay jugadores inscritos.
                            </p>
                        {/if}
                    </section>

                    <section>
                        <div class="mb-2 flex items-center justify-between">
                            <h2 class="text-base font-semibold">
                                Lista de espera
                            </h2>
                            <Badge variant="outline"
                                >{lista_espera.length}</Badge
                            >
                        </div>

                        {#if lista_espera.length > 0}
                            <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {#each lista_espera as inscripcion, index}
                                    <li
                                        class="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium dark:border-amber-900/50 dark:bg-amber-950/20"
                                    >
                                        <span class="text-muted-foreground"
                                            >{index +
                                                pichanga.maxJugadores +
                                                1}.</span
                                        >
                                        {inscripcion.user.apodo
                                            ? `${inscripcion.user.apodo} (${inscripcion.user.nombre})`
                                            : inscripcion.user.nombre}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <p
                                class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                            >
                                Sin lista de espera por ahora.
                            </p>
                        {/if}
                    </section>

                    <section>
                        <div class="mb-2 flex items-center justify-between">
                            <h2 class="text-base font-semibold">Se salieron</h2>
                            <Badge variant="outline"
                                >{inscripciones_salieron.length}</Badge
                            >
                        </div>

                        {#if inscripciones_salieron.length > 0}
                            <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {#each inscripciones_salieron as inscripcion}
                                    <li
                                        class="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900/40"
                                    >
                                        <div
                                            class="flex items-center justify-between gap-2"
                                        >
                                            <span>
                                                {inscripcion.user.apodo
                                                    ? `${inscripcion.user.apodo} (${inscripcion.user.nombre})`
                                                    : inscripcion.user.nombre}
                                            </span>
                                            {#if inscripcion.posicionEnLista}
                                                <Badge variant="secondary"
                                                    >#{inscripcion.posicionEnLista}</Badge
                                                >
                                            {/if}
                                        </div>
                                        {#if inscripcion.tiempoSalidaLista}
                                            <p
                                                class="mt-1 text-xs text-muted-foreground"
                                            >
                                                Salió: {new Date(
                                                    inscripcion.tiempoSalidaLista
                                                ).toLocaleString('es-CL')}
                                            </p>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        {:else}
                            <p
                                class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                            >
                                Nadie se ha salido todavía.
                            </p>
                        {/if}
                    </section>
                </Card.Content>
            </Card.Root>
        </div>
    </div>
{:else}
    <Skeleton />
{/if}
