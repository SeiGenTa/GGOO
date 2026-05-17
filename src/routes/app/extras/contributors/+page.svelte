<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <Card.Root class="shadow-sm">
        <Card.Header>
            <Card.Title>Contribuciones</Card.Title>
            <Card.Description>Reconocimiento a quienes colaboran en el desarrollo</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3 text-sm text-muted-foreground">
            <p>
                Aquí se mostrarán los aportes de las personas que han contribuido al proyecto,
                incluyendo mejoras de código, correcciones, documentación y soporte técnico.
            </p>
            <p>
                La idea es mantener una sección visible y actualizada para agradecer el trabajo
                colaborativo de la comunidad.
            </p>
        </Card.Content>
    </Card.Root>

    {#if data.contributors.length === 0}
        <Card.Root class="border-dashed">
            <Card.Content class="py-10 text-center text-muted-foreground">
                La aplicacion no tiene registrado ningun contribuyente al codigo de la app
            </Card.Content>
        </Card.Root>
    {:else}
        <section class="grid gap-5 md:grid-cols-2">
            {#each data.contributors as contributor}
                <Card.Root class="overflow-hidden border bg-card shadow-sm transition hover:shadow-md">
                    <Card.Header class="space-y-4">
                        <div class="flex items-center gap-3">
                            <img
                                src={contributor.image}
                                alt={`Foto de ${contributor.name}`}
                                class="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                                loading="lazy"
                            />
                            <div>
                                <Card.Title class="text-lg">{contributor.name}</Card.Title>
                                <Card.Description>Contribuidor del proyecto</Card.Description>
                            </div>
                        </div>
                    </Card.Header>

                    <Card.Content class="space-y-4">
                        <p class="text-sm leading-relaxed text-foreground/90">{contributor.description}</p>

                        {#if contributor.link?.length > 0}
                            <div class="flex flex-wrap gap-2">
                                {#each contributor.link as item}
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                                    >
                                        {item.icon}
                                    </a>
                                {/each}
                            </div>
                        {/if}

                        {#if contributor.buyme_a_coffee?.length > 0}
                            <div class="rounded-xl border bg-linear-to-r from-amber-50 to-orange-100 p-4">
                                <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                    Apoya este trabajo
                                </p>
                                <div class="space-y-2">
                                    {#each contributor.buyme_a_coffee as coffee}
                                        <a
                                            href={coffee.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="group flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:shadow"
                                        >
                                            <span class="flex items-center gap-2 font-medium text-amber-900">
                                                <span>{coffee.icon}</span>
                                                <span>{coffee.text}</span>
                                            </span>
                                            <span class="text-xs text-amber-700 transition group-hover:text-amber-900">
                                                Ir
                                            </span>
                                        </a>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            {/each}
        </section>
    {/if}
</div>