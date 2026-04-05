<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Item from "$lib/components/ui/item";
    import * as Accordion from "$lib/components/ui/accordion";
    import { slide } from "svelte/transition";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import { ChevronDown } from "@lucide/svelte";
    import ModalAddPichanga from "./components/new_pichanga.svelte";
    import type { PageProps } from "./$types";
    import { Permissions } from "$lib/permissions";

    let { data }: PageProps = $props();

    const getFillPercentage = (members: number, limit: number) => {
        if (limit === 0) return 0;
        return Math.min(100, Math.round((members / limit) * 100));
    };

    const getStatusLabel = (
        pichanga: Pichanga_struct,
    ): [string, "destructive" | "default" | "link" | "secondary" | "outline" | "ghost" | undefined] => {
        if (new Date(pichanga.date) < new Date()) return ["Finalizada", "outline"];
        if (pichanga.members.length >= pichanga.limit_members) return ["Completa", "destructive"];
        if (pichanga.members.length >= Math.ceil(pichanga.limit_members * 0.7)) return ["Ultimos cupos", "link"];
        return ["Con espacios", "default"];
    };
</script>

<section class="pichangas-view">
    {#if data.user!.permisos.includes(Permissions.CrearPartidos)}
        <ModalAddPichanga />
    {/if}
    
    {#await data.pichangas}
        <p>Cargando pichangas...</p>
    {:then pichangas}
        <Accordion.Root type="single" class="space-y-3">
            {#each pichangas as pichanga}
                {@const inscritos = pichanga.members.length}
                {@const porcentaje = getFillPercentage(inscritos, pichanga.limit_members)}
                {@const miembros = pichanga.members.filter((_, index) => index < pichanga.limit_members)}
                {@const espera = pichanga.members.filter((_, index) => index >= pichanga.limit_members)}
                {@const [statusLabel, variant_badge] = getStatusLabel(pichanga)}
                {@const finalizado = new Date(pichanga.date) < new Date()}

                <Accordion.Item class="event-card group border-0" value={`pichanga-${pichanga.id}`}>
                    <Accordion.Trigger class="event-trigger w-full p-4 sm:p-5">
                        {#snippet child({ props, open })}
                            <Item.Root>
                                <Item.Content class="p-0 m-0 w-full">
                                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <Item.Title class="text-base sm:text-lg">
                                                {#if pichanga.name}
                                                    {pichanga.name}
                                                {:else}
                                                    Pichanga sin nombre
                                                {/if}
                                                {#if !finalizado}
                                                    <Button
                                                        href={`/app/pichangas/stream/${pichanga.id}`}
                                                        variant="secondary"
                                                        class="shadow-2xs bg-red-600 hover:bg-red-800 text-white"
                                                        size="xs">Lista en vivo</Button
                                                    >
                                                {/if}</Item.Title
                                            >
                                            <Item.Description class="mt-1 text-xs sm:text-sm">
                                                admins:
                                                {pichanga.admins_name.join(", ")} • {new Date(pichanga.date).toLocaleDateString("es-Cl", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </Item.Description>
                                        </div>
                                        <div class="flex flex-row">
                                            <Badge variant={variant_badge}>
                                                {statusLabel}
                                            </Badge>
                                        </div>
                                    </div>

                                    {#if !finalizado}
                                        <div class="mt-3 space-y-2">
                                            <div class="flex items-center justify-between text-sm">
                                                <span class="text-muted-foreground">Cupos ocupados</span>
                                                <span class="font-medium">{inscritos}/{pichanga.limit_members}</span>
                                            </div>
                                            <div class="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    class="h-full rounded-full bg-primary transition-all duration-500"
                                                    style={`width: ${porcentaje}%`}
                                                ></div>
                                            </div>
                                        </div>
                                    {/if}
                                </Item.Content>
                                <Item.Actions>
                                    <Button {...props} size="icon-xs" variant="ghost" class="flex justify-center items-center">
                                        <ChevronDown class={`transition-transform ${open ? "rotate-180" : ""}`} />
                                    </Button>
                                </Item.Actions>
                            </Item.Root>
                        {/snippet}
                    </Accordion.Trigger>
                    <Accordion.Content class="event-content px-4 pb-5 sm:px-5" forceMount={true}>
                        {#snippet child({ props, open })}
                            {#if open}
                                <div {...props} transition:slide class="p-4">
                                    {#if finalizado}
                                        <div class="mt-3 space-y-2 pt-4 pb-4">
                                            <div class="flex items-center justify-between text-sm">
                                                <span class="text-muted-foreground">Cupos ocupados</span>
                                                <span class="font-medium">{inscritos}/{pichanga.limit_members}</span>
                                            </div>
                                            <div class="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    class="h-full rounded-full bg-primary transition-all duration-500"
                                                    style={`width: ${porcentaje}%`}
                                                ></div>
                                            </div>
                                        </div>
                                    {/if}
                                    <div class="grid gap-3 sm:grid-cols-2 mb-4">
                                        <div class="rounded-lg border bg-background/50 p-3">
                                            <p class="text-xs uppercase tracking-wide text-muted-foreground">Administradores</p>
                                            <p class="mt-1 text-sm font-medium">
                                                {pichanga.admins_name.join(", ")}
                                            </p>
                                        </div>
                                        <div class="rounded-lg border bg-background/50 p-3">
                                            <p class="text-xs uppercase tracking-wide text-muted-foreground">Fecha</p>
                                            <p class="mt-1 text-sm font-medium">{pichanga.date}</p>
                                        </div>
                                    </div>

                                    <div class="space-y-4">
                                        <div>
                                            <h4 class="mb-2 text-sm font-semibold">Lista</h4>
                                            {#if miembros.length > 0}
                                                <ul class="member-grid">
                                                    {#each miembros as member}
                                                        <li class="member-chip">{member.name}</li>
                                                    {/each}
                                                </ul>
                                            {:else}
                                                <p class="text-sm text-muted-foreground">Sin inscritos por ahora.</p>
                                            {/if}
                                        </div>

                                        {#if espera.length > 0}
                                            <div>
                                                <h4 class="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                                    Lista de espera ({espera.length})
                                                </h4>
                                                <ul class="member-grid">
                                                    {#each espera as member}
                                                        <li class="member-chip member-chip-waiting">{member.name}</li>
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
        </Accordion.Root>
    {/await}
</section>
