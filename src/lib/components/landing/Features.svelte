<script lang="ts">
    import * as Card from '$lib/components/ui/card'
    import VolleyballIcon from '@lucide/svelte/icons/volleyball'
    import UsersIcon from '@lucide/svelte/icons/users'
    import KeyIcon from '@lucide/svelte/icons/key'
    import BadgeAlertIcon from '@lucide/svelte/icons/badge-alert'
    import CodeXmlIcon from '@lucide/svelte/icons/code-xml'
    import HeartHandshakeIcon from '@lucide/svelte/icons/heart-handshake'
    import type { Component } from 'svelte'

    interface Feature {
        icon: Component
        title: string
        description: string
        gradient: string
        iconColor: string
    }

    const features: Feature[] = [
        {
            icon: VolleyballIcon,
            title: 'Pichangas en tiempo real',
            description:
                'Los admins publican los partidos y los miembros se inscriben al instante. La lista se actualiza en vivo para todos los participantes.',
            gradient: 'from-sky-500/10 via-cyan-500/10 to-emerald-500/10',
            iconColor: 'text-sky-500',
        },
        {
            icon: UsersIcon,
            title: 'Gestión de miembros',
            description:
                'Administrá tu comunidad: altas, bajas, apodos y validación de nuevos ingresos. Mantené el padrón actualizado sin planillas.',
            gradient: 'from-violet-500/10 via-fuchsia-500/10 to-pink-500/10',
            iconColor: 'text-violet-500',
        },
        {
            icon: KeyIcon,
            title: 'Roles y permisos',
            description:
                'Sistema flexible de roles con permisos granulares para que cada admin tenga el alcance justo sobre la app.',
            gradient: 'from-amber-500/10 via-orange-500/10 to-rose-500/10',
            iconColor: 'text-amber-500',
        },
        {
            icon: BadgeAlertIcon,
            title: 'Sistema de tarjetas',
            description:
                'Llevá el registro de tarjetas y consecuencias dentro del propio sistema, accesible para el miembro afectado y los admins.',
            gradient: 'from-rose-500/10 via-red-500/10 to-orange-500/10',
            iconColor: 'text-rose-500',
        },
        {
            icon: CodeXmlIcon,
            title: 'Código abierto',
            description:
                'Construido con SvelteKit, Prisma y PostgreSQL. Aportá con pull requests, reportá errores en GitHub o forkealo para tu comunidad.',
            gradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
            iconColor: 'text-emerald-500',
        },
        {
            icon: HeartHandshakeIcon,
            title: 'Hecho por y para comunidades',
            description:
                'Nacida en Volley Beauchef, adaptable a cualquier grupo con dinámicas similares. La herramienta crece según las necesidades del grupo.',
            gradient: 'from-indigo-500/10 via-blue-500/10 to-sky-500/10',
            iconColor: 'text-indigo-500',
        },
    ]
</script>

<section
    id="features"
    class="border-b border-border/40 bg-background py-20 md:py-28"
>
    <div class="container mx-auto max-w-6xl px-4">
        <div class="mx-auto max-w-2xl text-center">
            <p
                class="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Funcionalidades
            </p>
            <h2 class="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Todo lo que tu comunidad necesita, en un solo lugar
            </h2>
            <p class="mt-4 text-lg text-muted-foreground">
                Una app pensada para reemplazar el caos de los chats de WhatsApp
                con un sistema claro, ordenado y en tiempo real.
            </p>
        </div>

        <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each features as feature (feature.title)}
                <Card.Root
                    class="group relative overflow-hidden transition-all hover:shadow-md"
                >
                    <div
                        class="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100 {feature.gradient}"
                    ></div>
                    <Card.Header class="relative">
                        <div
                            class="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border bg-background {feature.iconColor}"
                        >
                            <feature.icon class="h-5 w-5" />
                        </div>
                        <Card.Title>{feature.title}</Card.Title>
                    </Card.Header>
                    <Card.Content class="relative">
                        <p class="text-sm text-muted-foreground">
                            {feature.description}
                        </p>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>
    </div>
</section>
