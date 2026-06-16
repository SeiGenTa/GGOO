<script lang="ts">
    import UserPlusIcon from '@lucide/svelte/icons/user-plus'
    import UserCheckIcon from '@lucide/svelte/icons/user-check'
    import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check'
    import TrophyIcon from '@lucide/svelte/icons/trophy'
    import type { Component } from 'svelte'

    interface Step {
        icon: Component
        title: string
        description: string
    }

    const steps: Step[] = [
        {
            icon: UserPlusIcon,
            title: 'Registrate',
            description:
                'Crea tu cuenta con nombre y apellido. Podés agregar un apodo para que te identifiquen dentro de la comunidad.',
        },
        {
            icon: UserCheckIcon,
            title: 'Un admin te valida',
            description:
                'Como es una comunidad cerrada, un administrador confirma que pertenecés al grupo antes de que puedas usar la app.',
        },
        {
            icon: CalendarCheckIcon,
            title: 'Inscribite a las pichangas',
            description:
                'Mirá los próximos partidos publicados y anotate en los que quieras. La lista se actualiza en tiempo real para todos.',
        },
        {
            icon: TrophyIcon,
            title: 'Jugá y acumulá tu historial',
            description:
                'Participá en los partidos, recibí tarjetas si corresponde y construí tu historial dentro de la comunidad.',
        },
    ]
</script>

<section
    id="how-it-works"
    class="border-b border-border/40 bg-muted/30 py-20 md:py-28"
>
    <div class="container mx-auto max-w-6xl px-4">
        <div class="mx-auto max-w-2xl text-center">
            <p
                class="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Cómo funciona
            </p>
            <h2 class="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Cuatro pasos y estás adentro
            </h2>
            <p class="mt-4 text-lg text-muted-foreground">
                Diseñado para que unirse a la comunidad sea tan simple como
                anotarse a un partido.
            </p>
        </div>

        <ol class="relative mt-12 grid gap-6 md:grid-cols-4 md:gap-4">
            {#each steps as step, i (step.title)}
                <li class="relative flex flex-col items-start">
                    <div
                        class="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-primary shadow-sm"
                    >
                        <span class="text-base font-semibold">{i + 1}</span>
                    </div>
                    <div
                        class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    >
                        <step.icon class="h-5 w-5" />
                    </div>
                    <h3 class="text-base font-semibold">{step.title}</h3>
                    <p class="mt-1.5 text-sm text-muted-foreground">
                        {step.description}
                    </p>
                </li>
            {/each}
        </ol>
    </div>
</section>
