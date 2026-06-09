<script lang="ts">
    import * as Card from '$lib/components/ui/card'
    import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte'

    let { rows = 10 }: { rows?: number } = $props()

    const rowArray = $derived(Array.from({ length: rows }))
</script>

<!-- Skeleton móvil -->
<div class="grid gap-3 p-4 lg:hidden">
    {#each rowArray as _, i (i)}
        <div class="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1 space-y-2">
                    <Skeleton class="h-4 w-3/4" />
                    <Skeleton class="h-3 w-1/2" />
                </div>
                <Skeleton class="h-5 w-16 rounded-full" />
            </div>

            <div class="space-y-2">
                <div class="space-y-1">
                    <Skeleton class="h-3 w-20" />
                    <Skeleton class="h-4 w-1/2" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <Skeleton class="h-3 w-full" />
                    <Skeleton class="h-3 w-full" />
                </div>
                <div class="flex gap-2">
                    <Skeleton class="h-5 w-16 rounded-full" />
                </div>
            </div>
        </div>
    {/each}
</div>

<!-- Skeleton escritorio -->
<div class="hidden overflow-x-auto lg:block">
    <table class="w-full min-w-260 text-sm">
        <thead>
            <tr class="border-b bg-muted/30 text-left">
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Razón</th>
                <th class="px-4 py-3 font-semibold">Asignada por</th>
                <th class="px-4 py-3 font-semibold">Creada</th>
                <th class="px-4 py-3 font-semibold">Vence en</th>
                <th class="px-4 py-3 font-semibold">Estado</th>
                <th class="px-4 py-3 font-semibold">Reclamo</th>
            </tr>
        </thead>
        <tbody>
            {#each rowArray as _, i (i)}
                <tr class="border-b align-top">
                    <td class="px-4 py-3">
                        <Skeleton class="h-5 w-16 rounded-full" />
                    </td>
                    <td class="px-4 py-3 max-w-96 space-y-1.5">
                        <Skeleton class="h-3 w-full" />
                        <Skeleton class="h-3 w-5/6" />
                    </td>
                    <td class="px-4 py-3">
                        <Skeleton class="h-4 w-28" />
                    </td>
                    <td class="px-4 py-3">
                        <Skeleton class="h-3 w-32" />
                    </td>
                    <td class="px-4 py-3">
                        <Skeleton class="h-3 w-32" />
                    </td>
                    <td class="px-4 py-3">
                        <Skeleton class="h-5 w-16 rounded-full" />
                    </td>
                    <td class="px-4 py-3">
                        <Skeleton class="h-8 w-32" />
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<!-- Paginador en skeleton (siempre visible desde el primer paint) -->
<Card.Root class="mt-0 border-0 shadow-none">
    <Card.Content class="px-0 pb-0">
        <div
            class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm"
        >
            <Skeleton class="h-4 w-64" />
            <div class="flex items-center gap-2">
                <Skeleton class="h-8 w-20" />
                <Skeleton class="h-8 w-20" />
            </div>
        </div>
    </Card.Content>
</Card.Root>
