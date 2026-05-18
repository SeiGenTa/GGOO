<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const normalizeIconName = (value: string) => value.trim().toLowerCase();
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
                                <Card.Description>{contributor.description}</Card.Description>
                            </div>
                        </div>
                    </Card.Header>

                    <Card.Content class="space-y-4">
                        <p class="text-sm leading-relaxed text-foreground/90">{contributor.detalle}</p>

                        {#if contributor.link?.length > 0}
                            <div class="flex flex-wrap gap-2">
                                {#each contributor.link as item}
                                    {@const normalizedIcon = normalizeIconName(item.icon)}
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                                    >
                                        {#if normalizedIcon === 'github'}
                                            <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4 fill-current">
                                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.699-2.782.605-3.369-1.344-3.369-1.344-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.53 2.341 1.088 2.91.833.091-.647.349-1.088.635-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.943.359.31.678.921.678 1.857 0 1.34-.012 2.421-.012 2.75 0 .269.18.58.688.481A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                                            </svg>
                                        {:else if normalizedIcon === 'instagram' || normalizedIcon === 'insta'}
                                            <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4 fill-current">
                                                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Zm5.25-2a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
                                            </svg>
                                        {:else if normalizedIcon === 'linkedin'}
                                            <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4 fill-current">
                                                <path d="M4.983 3.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM3.5 8.5h2.967V20.5H3.5v-12Zm4.75 0H11.1v1.64h.04c.396-.75 1.363-1.54 2.807-1.54 3.003 0 3.558 1.977 3.558 4.548V20.5h-2.967v-6.525c0-1.556-.027-3.558-2.167-3.558-2.17 0-2.503 1.695-2.503 3.445V20.5H8.25v-12Z" />
                                            </svg>
                                        {:else if normalizedIcon === 'telegram' || normalizedIcon === 'telegra'}
                                            <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4 fill-current">
                                                <path d="M21.944 4.665a1 1 0 0 0-1.036-.137L2.96 12.088a1 1 0 0 0 .09 1.872l4.982 1.659 1.659 4.982a1 1 0 0 0 .788.676l.13.008a1 1 0 0 0 .743-.331l10.59-12.119a1 1 0 0 0 0-1.17ZM9.374 14.626l-.97 3.232-.99-2.971 8.608-6.596-6.648 6.335Z" />
                                            </svg>
                                        {:else}
                                        <span>{item.icon}</span>
                                        {/if}
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