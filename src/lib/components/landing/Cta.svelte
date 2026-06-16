<script lang="ts">
    import { Button } from '$lib/components/ui/button'
    import * as Card from '$lib/components/ui/card'
    import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
    import LogInIcon from '@lucide/svelte/icons/log-in'
    import VolleyballIcon from '@lucide/svelte/icons/volleyball'
</script>

<section class="bg-background py-20 md:py-28">
    <div class="container mx-auto max-w-6xl px-4">
        <Card.Root
            class="relative overflow-hidden border-0 bg-linear-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 shadow-sm"
        >
            <div
                class="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
            ></div>
            <div
                class="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"
            ></div>

            <Card.Content
                class="relative flex flex-col items-center gap-6 p-10 text-center md:p-16"
            >
                <div
                    class="flex h-14 w-14 items-center justify-center rounded-full border bg-background text-primary shadow-sm"
                >
                    <VolleyballIcon class="h-7 w-7" />
                </div>
                <h2
                    class="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
                >
                    ¿Listo para la próxima pichanga?
                </h2>
                <p class="max-w-xl text-base text-muted-foreground md:text-lg">
                    Unite a tu comunidad, anotate a los partidos y dejá el
                    WhatsApp en paz. La próxima pichanga te está esperando.
                </p>
                <div
                    class="mt-2 flex flex-wrap items-center justify-center gap-3"
                >
                    <Button size="lg" href="/auth">
                        <LogInIcon class="mr-2 h-4 w-4" />
                        Iniciar sesión
                    </Button>
                    <Button size="lg" variant="outline" href="/auth/register">
                        Crear cuenta
                        <ArrowRightIcon class="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </Card.Content>
        </Card.Root>
    </div>
</section>
