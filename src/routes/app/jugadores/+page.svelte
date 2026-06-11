<script lang="ts">
    import type { PageData, SubmitFunction } from './$types'
    import { enhance } from '$app/forms'
    import { toast } from 'svelte-sonner'
    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Badge } from '$lib/components/ui/badge'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'

    type JugadorRow = PageData['jugadores'][number]

    let { data }: { data: PageData } = $props()

    let selectedJugador = $state<JugadorRow | null>(null)
    let dialogOpen = $state(false)

    const openDialog = (jugador: JugadorRow) => {
        selectedJugador = jugador
        dialogOpen = true
    }

    const STAT_LABELS: Record<keyof Pick<JugadorRow, 'statAtaque' | 'statRecepcion' | 'statBloqueo' | 'statSaque' | 'statArmada'>, string> = {
        statAtaque: 'Ataque',
        statRecepcion: 'Recepción',
        statBloqueo: 'Bloqueo',
        statSaque: 'Saque',
        statArmada: 'Armada',
    }

    const STAT_KEYS = ['statAtaque', 'statRecepcion', 'statBloqueo', 'statSaque', 'statArmada'] as const

    const hasAnyStats = (j: JugadorRow) =>
        STAT_KEYS.some((k) => j[k] !== null)

    const withFeedback: SubmitFunction = () => {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                const message =
                    (result.data as { message?: string } | null)?.message ??
                    'Estadísticas actualizadas.'
                toast('Guardado', { description: message })
                dialogOpen = false
                selectedJugador = null
                await update()
                return
            }

            if (result.type === 'failure') {
                const message =
                    (result.data as { message?: string } | null)?.message ??
                    'No fue posible guardar.'
                toast('Error', { description: message })
                return
            }

            await update()
        }
    }
</script>

<section class="space-y-6">
    <Card.Root>
        <Card.Header>
            <Card.Title>Jugadores</Card.Title>
            <Card.Description>
                Estadísticas de rendimiento por jugador. Haz clic en "Ver stats" para editar.
            </Card.Description>
        </Card.Header>
        <Card.Content class="p-0">
            <div class="overflow-x-auto">
                <table class="w-full min-w-180 text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30 text-left">
                            <th class="px-4 py-3 font-semibold">Jugador</th>
                            <th class="px-4 py-3 font-semibold">Pos. Principal</th>
                            <th class="px-4 py-3 font-semibold">Pos. Secundaria</th>
                            <th class="px-4 py-3 font-semibold">Stats</th>
                            <th class="px-4 py-3 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if data.jugadores.length === 0}
                            <tr>
                                <td colspan="5" class="px-4 py-10 text-center text-muted-foreground">
                                    No hay jugadores registrados.
                                </td>
                            </tr>
                        {:else}
                            {#each data.jugadores as jugador}
                                <tr class="border-b align-middle">
                                    <td class="px-4 py-3">
                                        <p class="font-medium">{jugador.nombre}</p>
                                        {#if jugador.apodo}
                                            <p class="text-xs text-muted-foreground">{jugador.apodo}</p>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if jugador.posiciones[0]}
                                            <Badge>{jugador.posiciones[0]}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">—</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if jugador.posiciones[1]}
                                            <Badge variant="outline">{jugador.posiciones[1]}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">—</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if hasAnyStats(jugador)}
                                            <div class="flex flex-wrap gap-1">
                                                {#each STAT_KEYS as key}
                                                    {#if jugador[key] !== null}
                                                        <Badge variant="secondary" class="text-xs">
                                                            {STAT_LABELS[key].slice(0, 2)}:{jugador[key]}
                                                        </Badge>
                                                    {/if}
                                                {/each}
                                            </div>
                                        {:else}
                                            <span class="text-xs text-muted-foreground">Sin stats</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onclick={() => openDialog(jugador)}
                                        >
                                            Ver stats
                                        </Button>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </Card.Content>
    </Card.Root>
</section>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {selectedJugador?.nombre ?? ''}
                {#if selectedJugador?.apodo}
                    <span class="text-muted-foreground font-normal text-base ml-1">({selectedJugador.apodo})</span>
                {/if}
            </Dialog.Title>
            <Dialog.Description class="flex gap-2 flex-wrap pt-1">
                {#if selectedJugador?.posiciones[0]}
                    <Badge>{selectedJugador.posiciones[0]}</Badge>
                {/if}
                {#if selectedJugador?.posiciones[1]}
                    <Badge variant="outline">{selectedJugador.posiciones[1]}</Badge>
                {/if}
                {#if !selectedJugador?.posiciones[0] && !selectedJugador?.posiciones[1]}
                    <span class="text-muted-foreground text-xs">Sin posiciones definidas</span>
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedJugador}
            <!-- Visualización de stats actuales -->
            <div class="space-y-3 py-2">
                {#each STAT_KEYS as key}
                    {@const val = selectedJugador[key]}
                    <div class="grid grid-cols-[100px_1fr_28px] items-center gap-3">
                        <span class="text-sm font-medium">{STAT_LABELS[key]}</span>
                        <div class="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                class="h-2 bg-primary rounded-full transition-all"
                                style="width: {val !== null ? (val / 10) * 100 : 0}%"
                            ></div>
                        </div>
                        <span class="text-sm font-semibold text-right">
                            {val !== null ? val : '—'}
                        </span>
                    </div>
                {/each}
            </div>

            <!-- Formulario de edición (solo si canEdit) -->
            {#if data.canEdit}
                <div class="border-t pt-4">
                    <p class="text-xs text-muted-foreground mb-3">Editar estadísticas (1–10, vacío para borrar)</p>
                    <form
                        method="POST"
                        action="?/update_stats"
                        id="update-stats-form"
                        use:enhance={withFeedback}
                        class="space-y-2"
                    >
                        <input type="hidden" name="userId" value={selectedJugador.id} />
                        {#each STAT_KEYS as key}
                            <div class="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label class="text-sm" for="input-{key}">{STAT_LABELS[key]}</label>
                                <Input
                                    id="input-{key}"
                                    name={key}
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={selectedJugador[key] ?? ''}
                                    placeholder="—"
                                    class="h-8"
                                />
                            </div>
                        {/each}
                    </form>
                </div>
            {/if}
        {/if}

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cerrar</Button>
            </Dialog.Close>
            {#if data.canEdit}
                <Button type="submit" form="update-stats-form">
                    Guardar
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
