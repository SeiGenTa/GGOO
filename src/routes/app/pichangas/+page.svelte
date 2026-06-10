<script lang="ts">
    import Button from '$lib/components/ui/button/button.svelte'
    import * as Item from '$lib/components/ui/item'
    import * as Accordion from '$lib/components/ui/accordion'
    import { slide } from 'svelte/transition'
    import Badge from '$lib/components/ui/badge/badge.svelte'
    import { ChevronDown } from '@lucide/svelte'
    import ModalAddPichanga from './components/new_pichanga.svelte'
    import { Permissions } from '$lib/permissions'
    import SkeletonPichanga from './components/skeleton_pichanga.svelte'
    import { onMount } from 'svelte'
    import { invalidateAll } from '$app/navigation'
    import { toast } from 'svelte-sonner'

    let { data } = $props()

    const getFillPercentage = (members: number, limit: number) => {
        if (limit === 0) return 0
        return Math.min(100, Math.round((members / limit) * 100))
    }

    const getStatusLabel = (
        pichanga: Pichanga_struct
    ): [
        string,
        (
            | 'destructive'
            | 'default'
            | 'link'
            | 'secondary'
            | 'outline'
            | 'ghost'
            | undefined
        ),
    ] => {
        const ahora = new Date()
        const inicioInscripcion = new Date(pichanga.fechaInicioIncripcion)
        const inicioEvento = new Date(pichanga.date)

        if (inicioEvento <= ahora) return ['Finalizada', 'outline']
        if (ahora < inicioInscripcion) return ['Próxima', 'secondary']
        if (pichanga.members.length >= pichanga.limit_members)
            return ['Completa', 'destructive']
        if (pichanga.members.length >= Math.ceil(pichanga.limit_members * 0.7))
            return ['Últimos cupos', 'link']
        return ['Inscripción abierta', 'default']
    }

    onMount(() => {
        const eventSource = new EventSource('/api/stream')

        const handlePichangaUpdate = async (event: MessageEvent) => {
            let payload: { type?: string; pichangaId?: string } = {}
            try {
                payload = JSON.parse(event.data)
            } catch {
                return
            }

            if (payload.type === 'opened') {
                toast.info('Una pichanga abrió sus inscripciones', {
                    description: 'Ya puedes inscribirte desde la lista.',
                })
                await invalidateAll()
            }
        }

        eventSource.addEventListener('pichanga-update', handlePichangaUpdate)
        eventSource.onerror = () => {
            eventSource.close()
        }

        return () => {
            eventSource.removeEventListener(
                'pichanga-update',
                handlePichangaUpdate
            )
            eventSource.close()
        }
    })
</script>

<section class="pichangas-view">
    {#if data.user!.permisos.includes(Permissions.CrearPartidos)}
        {#await data.gestores then gestores}
            <ModalAddPichanga {gestores} />
        {/await}
    {/if}

    {#await data.future.pichangas}
        <div class="space-y-8 mb-6 pt-10">
            {#each Array(5) as _}
                <SkeletonPichanga />
            {/each}
        </div>
    {:then pichangas}
        <Accordion.Root type="single" class="space-y-3">
            {#each pichangas as pichanga}
                {@const inscritos = pichanga.members.length}
                {@const porcentaje = getFillPercentage(
                    inscritos,
                    pichanga.limit_members
                )}
                {@const miembros = pichanga.members.filter(
                    (_, index) => index < pichanga.limit_members
                )}
                {@const espera = pichanga.members.filter(
                    (_, index) => index >= pichanga.limit_members
                )}
                {@const [statusLabel, variant_badge] = getStatusLabel(pichanga)}
                {@const finalizado = new Date(pichanga.date) <= new Date()}
                {@const inscripcionesAbiertas =
                    new Date() >= new Date(pichanga.fechaInicioIncripcion) &&
                    new Date() < new Date(pichanga.date)}

                <Accordion.Item
                    class="event-card group border-0"
                    value={`pichanga-${pichanga.id}`}
                >
                    <Accordion.Trigger class="event-trigger w-full p-4 sm:p-5">
                        {#snippet child({ props, open })}
                            <Item.Root>
                                <Item.Content class="p-0 m-0 w-full">
                                    <div
                                        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <Item.Title
                                                class="text-base sm:text-lg"
                                            >
                                                {#if pichanga.name}
                                                    {pichanga.name}
                                                {:else}
                                                    Pichanga sin nombre
                                                {/if}
                                                <Button
                                                    href={`/app/pichangas/stream/${pichanga.id}`}
                                                    variant="secondary"
                                                    class={`shadow-2xs text-white ${finalizado ? 'bg-slate-700 hover:bg-slate-800' : 'bg-red-600 hover:bg-red-800'}`}
                                                    size="xs"
                                                    >{finalizado
                                                        ? 'Ver lista'
                                                        : inscripcionesAbiertas
                                                          ? 'Ir a inscribirse'
                                                          : 'Ver detalles'}</Button
                                                ></Item.Title
                                            >
                                            <Item.Description
                                                class="mt-1 text-xs sm:text-sm"
                                            >
                                                admins:
                                                {pichanga.admins_name.join(
                                                    ', '
                                                )} • {new Date(
                                                    pichanga.date
                                                ).toLocaleDateString('es-CL', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </Item.Description>
                                        </div>
                                        <div class="flex flex-row">
                                            <Badge variant={variant_badge}>
                                                {statusLabel}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div class="mt-3 space-y-2">
                                        <div
                                            class="flex items-center justify-between text-sm"
                                        >
                                            <span class="text-muted-foreground"
                                                >Cupos ocupados</span
                                            >
                                            <span class="font-medium"
                                                >{inscritos}/{pichanga.limit_members}</span
                                            >
                                        </div>
                                        <div
                                            class="h-2 overflow-hidden rounded-full bg-muted"
                                        >
                                            <div
                                                class="h-full rounded-full bg-primary transition-all duration-500"
                                                style={`width: ${porcentaje}%`}
                                            ></div>
                                        </div>
                                    </div>
                                </Item.Content>
                                <Item.Actions>
                                    <Button
                                        {...props}
                                        size="icon-xs"
                                        variant="ghost"
                                        class="flex justify-center items-center"
                                    >
                                        <ChevronDown
                                            class={`transition-transform ${open ? 'rotate-180' : ''}`}
                                        />
                                    </Button>
                                </Item.Actions>
                            </Item.Root>
                        {/snippet}
                    </Accordion.Trigger>
                    <Accordion.Content
                        class="event-content px-4 pb-5 sm:px-5"
                        forceMount={true}
                    >
                        {#snippet child({ props, open })}
                            {#if open}
                                <div {...props} transition:slide class="p-4">
                                    {#if finalizado}
                                        <div
                                            class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                                        >
                                            Esta pichanga ya fue realizada.
                                            Puedes revisar la lista, pero no hay
                                            acciones disponibles.
                                        </div>
                                    {/if}
                                    <div class="grid gap-3 sm:grid-cols-2 mb-4">
                                        <div
                                            class="rounded-lg border bg-background/50 p-3"
                                        >
                                            <p
                                                class="text-xs uppercase tracking-wide text-muted-foreground"
                                            >
                                                Administradores
                                            </p>
                                            <p class="mt-1 text-sm font-medium">
                                                {pichanga.admins_name.join(
                                                    ', '
                                                )}
                                            </p>
                                        </div>
                                        <div
                                            class="rounded-lg border bg-background/50 p-3"
                                        >
                                            <p
                                                class="text-xs uppercase tracking-wide text-muted-foreground"
                                            >
                                                Fecha
                                            </p>
                                            <p class="mt-1 text-sm font-medium">
                                                {pichanga.date}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="space-y-4">
                                        <div>
                                            <h4
                                                class="mb-2 text-sm font-semibold"
                                            >
                                                Lista
                                            </h4>
                                            {#if miembros.length > 0}
                                                <ul class="member-grid">
                                                    {#each miembros as member}
                                                        <li class="member-chip">
                                                            {member.name}
                                                        </li>
                                                    {/each}
                                                </ul>
                                            {:else}
                                                <p
                                                    class="text-sm text-muted-foreground"
                                                >
                                                    Sin inscritos por ahora.
                                                </p>
                                            {/if}
                                        </div>

                                        {#if espera.length > 0}
                                            <div>
                                                <h4
                                                    class="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300"
                                                >
                                                    Lista de espera ({espera.length})
                                                </h4>
                                                <ul class="member-grid">
                                                    {#each espera as member}
                                                        <li
                                                            class="member-chip member-chip-waiting"
                                                        >
                                                            {member.name}
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/snippet}
                    </Accordion.Content>
                </Accordion.Item>
            {/each}
            {#if pichangas.length === 0}
                <div
                    class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                >
                    {#if data.canManagePartidos}
                        No hay pichangas registradas todavía.
                    {:else}
                        No hay pichangas disponibles para inscripción en este
                        momento. Las próximas aperturas aparecen aquí
                        automáticamente.
                    {/if}
                </div>
            {/if}
        </Accordion.Root>
    {/await}
</section>
