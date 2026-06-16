<script lang="ts">
    import * as Card from '$lib/components/ui/card'
    import { Button } from '$lib/components/ui/button'
    import { Badge } from '$lib/components/ui/badge'
    import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
    import GithubIcon from '@lucide/svelte/icons/code-xml'

    interface Contributor {
        login: string
        name: string
        role: string
        url: string
        avatar: string
        contributions: number
    }

    const contributors: Contributor[] = [
        {
            login: 'SeiGenTa',
            name: 'SeiGenTa',
            role: 'Creador y mantenedor',
            url: 'https://github.com/SeiGenTa',
            avatar: 'https://avatars.githubusercontent.com/u/104644283?v=4',
            contributions: 152,
        },
        {
            login: 'AndresArriagada',
            name: 'Andrés Arriagada',
            role: 'Contribuidor',
            url: 'https://github.com/AndresArriagada',
            avatar: 'https://avatars.githubusercontent.com/u/89280744?v=4',
            contributions: 13,
        },
    ]

    const totalContributions = contributors.reduce(
        (acc, c) => acc + c.contributions,
        0
    )
</script>

<section
    id="contributors"
    class="border-b border-border/40 bg-background py-20 md:py-28"
>
    <div class="container mx-auto max-w-6xl px-4">
        <div class="mx-auto max-w-2xl text-center">
            <p
                class="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Contribuidores
            </p>
            <h2 class="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Hecho con aportes de la comunidad
            </h2>
            <p class="mt-4 text-lg text-muted-foreground">
                Esta app crece gracias a las merge requests y al feedback de
                quienes la usan día a día. ¡Sumá la tuya!
            </p>
        </div>

        <div
            class="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"
        >
            <Badge variant="secondary" class="px-3 py-1">
                {contributors.length} contribuidores
            </Badge>
            <Badge variant="secondary" class="px-3 py-1">
                {totalContributions}+ commits
            </Badge>
        </div>

        <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each contributors as contributor (contributor.login)}
                <Card.Root
                    class="group transition-all hover:border-primary/40 hover:shadow-md"
                >
                    <Card.Content class="flex items-center gap-4 p-5">
                        <a
                            href={contributor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Perfil de GitHub de {contributor.name}"
                            class="shrink-0"
                        >
                            <img
                                src={contributor.avatar}
                                alt={contributor.name}
                                loading="lazy"
                                class="h-14 w-14 rounded-full border-2 border-border object-cover transition-transform group-hover:scale-105"
                            />
                        </a>
                        <div class="min-w-0 flex-1">
                            <a
                                href={contributor.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="block truncate font-semibold hover:underline"
                            >
                                {contributor.name}
                            </a>
                            <p class="truncate text-sm text-muted-foreground">
                                {contributor.role}
                            </p>
                            <p class="mt-1 text-xs text-muted-foreground">
                                {contributor.contributions} aportes al proyecto
                            </p>
                        </div>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>

        <div class="mt-10 flex justify-center">
            <Button
                variant="outline"
                size="lg"
                href="https://github.com/SeiGenTa/GGOO/graphs/contributors"
            >
                <GithubIcon class="mr-2 h-4 w-4" />
                Ver todos en GitHub
                <ArrowRightIcon class="ml-2 h-4 w-4" />
            </Button>
        </div>

        <p class="mt-6 text-center text-sm text-muted-foreground">
            ¿Querés aparecer acá? Abrí un
            <a
                href="https://github.com/SeiGenTa/GGOO/blob/main/README.md#c%C3%B3mo-aportar"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
                merge request
            </a>
            en el repositorio.
        </p>
    </div>
</section>
