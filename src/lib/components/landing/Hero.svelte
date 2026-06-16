<script lang="ts">
    import { Button } from '$lib/components/ui/button'
    import * as Card from '$lib/components/ui/card'
    import { Badge } from '$lib/components/ui/badge'
    import VolleyballIcon from '@lucide/svelte/icons/volleyball'
    import LogInIcon from '@lucide/svelte/icons/log-in'
    import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
    import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check'
    import BadgeAlertIcon from '@lucide/svelte/icons/badge-alert'
</script>

<section
    class="relative overflow-hidden border-b border-border/40 bg-linear-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10"
>
    <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.7_0.15_220_/_0.15),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.7_0.15_160_/_0.15),transparent_50%)]"
    ></div>

    <div
        class="container relative mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:py-28"
    >
        <div class="flex flex-col justify-center">
            <Badge
                variant="secondary"
                class="mb-4 w-fit gap-1.5 px-3 py-1 text-xs"
            >
                <VolleyballIcon class="h-3.5 w-3.5" />
                Para comunidades deportivas
            </Badge>

            <h1
                class="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
            >
                Gestioná las pichangas de tu comunidad,
                <span
                    class="bg-linear-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent"
                >
                    sin caos de WhatsApp
                </span>.
            </h1>

            <p class="mt-6 max-w-xl text-lg text-muted-foreground">
                Una app de código abierto para que los miembros se inscriban a
                los partidos, los admins lleven el control y todos jueguen.
                Lista en tiempo real, validación de nuevos ingresos y registro
                de tarjetas en un solo lugar.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" href="/auth">
                    <LogInIcon class="mr-2 h-4 w-4" />
                    Iniciar sesión
                </Button>
                <Button size="lg" variant="outline" href="/auth/register">
                    Crear cuenta
                    <ArrowRightIcon class="ml-2 h-4 w-4" />
                </Button>
                <Button
                    size="lg"
                    variant="ghost"
                    href="https://github.com/SeiGenTa/GGOO"
                >
                    Ver en GitHub
                </Button>
            </div>

            <p class="mt-4 text-xs text-muted-foreground">
                Reemplazá las inscripciones por WhatsApp con un sistema hecho
                para tu grupo.
            </p>
        </div>

        <div class="relative hidden md:block">
            <div class="relative mx-auto max-w-md">
                <Card.Root
                    class="absolute -left-6 top-4 w-64 rotate-[-4deg] shadow-xl"
                >
                    <Card.Header class="pb-2">
                        <Card.Title class="flex items-center gap-2 text-base">
                            <CalendarCheckIcon
                                class="h-4 w-4 text-emerald-500"
                            />
                            Pichanga viernes
                        </Card.Title>
                        <Card.Description
                            >20:00 · 8/10 inscritos</Card.Description
                        >
                    </Card.Header>
                    <Card.Content>
                        <div class="flex -space-x-2">
                            {#each Array(6) as _, i (i)}
                                <div
                                    class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-linear-to-br from-sky-500 to-cyan-500 text-[10px] font-semibold text-white"
                                >
                                    {String.fromCharCode(65 + i)}
                                </div>
                            {/each}
                            <div
                                class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground"
                            >
                                +2
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>

                <Card.Root class="relative w-full rotate-[2deg] shadow-2xl">
                    <Card.Header>
                        <Card.Title class="text-lg">
                            Próximos partidos
                        </Card.Title>
                        <Card.Description>Esta semana</Card.Description>
                    </Card.Header>
                    <Card.Content class="space-y-3">
                        <div
                            class="flex items-center justify-between rounded-lg border bg-background/60 p-3"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-500"
                                >
                                    <VolleyballIcon class="h-4 w-4" />
                                </div>
                                <div>
                                    <p class="text-sm font-medium">Viernes</p>
                                    <p class="text-xs text-muted-foreground">
                                        20:00 hs
                                    </p>
                                </div>
                            </div>
                            <Badge
                                variant="secondary"
                                class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            >
                                8/10
                            </Badge>
                        </div>
                        <div
                            class="flex items-center justify-between rounded-lg border bg-background/60 p-3"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500"
                                >
                                    <VolleyballIcon class="h-4 w-4" />
                                </div>
                                <div>
                                    <p class="text-sm font-medium">Sábado</p>
                                    <p class="text-xs text-muted-foreground">
                                        18:00 hs
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary">6/10</Badge>
                        </div>
                    </Card.Content>
                </Card.Root>

                <Card.Root
                    class="absolute -right-4 bottom-2 w-56 rotate-[6deg] shadow-xl"
                >
                    <Card.Content class="flex items-center gap-3 p-4">
                        <div
                            class="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-500"
                        >
                            <BadgeAlertIcon class="h-4 w-4" />
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">
                                Tu tarjeta
                            </p>
                            <p class="text-sm font-medium">1 amarilla</p>
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>
        </div>
    </div>
</section>
