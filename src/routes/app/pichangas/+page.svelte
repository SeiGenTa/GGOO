<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Item from "$lib/components/ui/item";
    import * as Accordion from "$lib/components/ui/accordion";
    import { slide } from "svelte/transition";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import { ChevronDown } from "@lucide/svelte";
    import ModalAddPichanga from "./components/new_pichanga.svelte";

    interface Pichanga {
        id: number;
        name: string;
        admins_name: string[];
        date: string;
        limit_members: number;
        members: { id: number; name: string }[];
    }

    const pinchangas = [
        {
            id: 1,
            name: "Pichanga Centro",
            admins_name: ["Carlos", "María"],
            date: "2026-04-10T00:00:00-03:00",
            limit_members: 10,
            members: [
                { id: 1001, name: "Ana Pérez" },
                { id: 1002, name: "Luis Gómez" },
                { id: 1003, name: "Paula Ruiz" },
                { id: 1004, name: "Sergio López" },
                { id: 1005, name: "Marta Díaz" },
            ],
        },
        {
            id: 2,
            name: "Pichanga Noche",
            admins_name: ["Diego"],
            date: "2026-03-05T00:00:00-03:00",
            limit_members: 8,
            members: [
                { id: 2001, name: "Javier" },
                { id: 2002, name: "Lucía" },
                { id: 2003, name: "Tomás" },
                { id: 2004, name: "Elena" },
                { id: 2005, name: "Rocío" },
                { id: 2006, name: "Mateo" },
                { id: 2007, name: "Isabel" },
                { id: 2008, name: "Pedro" },
                { id: 2009, name: "Sofía" },
            ],
        },
        {
            id: 3,
            name: "Pichanga Playa",
            admins_name: ["Nuria", "Óscar"],
            date: "2026-03-12T00:00:00-03:00",
            limit_members: 12,
            members: [
                { id: 3001, name: "Iván" },
                { id: 3002, name: "Noelia" },
                { id: 3003, name: "Rubén" },
                { id: 3004, name: "Carla" },
                { id: 3005, name: "Hugo" },
                { id: 3006, name: "Sandra" },
                { id: 3007, name: "Bruno" },
                { id: 3008, name: "Patricia" },
                { id: 3009, name: "Andrés" },
                { id: 3010, name: "Clara" },
                { id: 3011, name: "Victor" },
                { id: 3012, name: "Mónica" },
            ],
        },
        {
            id: 4,
            name: "Pichanga Domingos",
            admins_name: ["Gonzalo"],
            date: "2026-03-20T00:00:00-03:00",
            limit_members: 16,
            members: [
                { id: 4001, name: "Pablo" },
                { id: 4002, name: "Rita" },
                { id: 4003, name: "Andrés" },
                { id: 4004, name: "Claudia" },
                { id: 4005, name: "Fabián" },
                { id: 4006, name: "Nora" },
                { id: 4007, name: "Raúl" },
                { id: 4008, name: "Luna" },
                { id: 4009, name: "César" },
                { id: 4010, name: "Irene" },
                { id: 4011, name: "Gema" },
                { id: 4012, name: "León" },
                { id: 4013, name: "Sonia" },
                { id: 4014, name: "Óscar" },
                { id: 4015, name: "Mauro" },
                { id: 4016, name: "Belén" },
                { id: 4017, name: "Extra 1" },
                { id: 4018, name: "Extra 2" },
            ],
        },
        {
            id: 5,
            name: "Pichanga",
            admins_name: ["Raquel"],
            date: "2026-03-25T00:00:00-03:00",
            limit_members: 6,
            members: [
                { id: 5001, name: "Gerson" },
                { id: 5002, name: "Ivette" },
                { id: 5003, name: "Héctor" },
            ],
        },
        {
            id: 6,
            name: "Pichanga Amistosa",
            admins_name: ["Luciano"],
            date: "2026-05-10T00:00:00-03:00",
            limit_members: 10,
            members: [],
        },
        {
            id: 7,
            name: "Pichanga Torneo",
            admins_name: ["Equipo A", "Equipo B"],
            date: "2026-05-15T00:00:00-03:00",
            limit_members: 14,
            members: [
                { id: 7001, name: "Equipo 1" },
                { id: 7002, name: "Equipo 2" },
                { id: 7003, name: "Equipo 3" },
                { id: 7004, name: "Equipo 4" },
                { id: 7005, name: "Equipo 5" },
                { id: 7006, name: "Equipo 6" },
                { id: 7007, name: "Equipo 7" },
                { id: 7008, name: "Equipo 8" },
                { id: 7009, name: "Equipo 9" },
                { id: 7010, name: "Equipo 10" },
                { id: 7011, name: "Equipo 11" },
                { id: 7012, name: "Equipo 12" },
                { id: 7013, name: "Equipo 13" },
                { id: 7014, name: "Equipo 14" },
            ],
        },
    ];

    const getFillPercentage = (members: number, limit: number) => {
        if (limit === 0) return 0;
        return Math.min(100, Math.round((members / limit) * 100));
    };

    const getStatusLabel = (pichanga: Pichanga): [string, "destructive" | "default" | "link" | "secondary" | "outline" | "ghost" | undefined] => {
        if (new Date(pichanga.date) < new Date()) return ["Finalizada", "outline"];
        if (pichanga.members.length >= pichanga.limit_members) return ["Completa", "destructive"];
        if (pichanga.members.length >= Math.ceil(pichanga.limit_members * 0.7)) return ["Ultimos cupos", "link"];
        return ["Con espacios", "default"];
    };
</script>

<section class="pichangas-view">
    <ModalAddPichanga/>
    <Accordion.Root type="single" class="space-y-3">
        {#each pinchangas as pichanga}
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
                                        <Item.Title class="text-base sm:text-lg"
                                            >{pichanga.name}{#if !finalizado}
                                                <Button href="#stream" variant="secondary" class="shadow-2xs bg-red-600 hover:bg-red-800 text-white" size="xs">Lista en vivo</Button>
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
</section>
