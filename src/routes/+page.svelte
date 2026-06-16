<script lang="ts">
    import Navbar from '$lib/components/landing/Navbar.svelte'
    import Hero from '$lib/components/landing/Hero.svelte'
    import Features from '$lib/components/landing/Features.svelte'
    import HowItWorks from '$lib/components/landing/HowItWorks.svelte'
    import Contributors from '$lib/components/landing/Contributors.svelte'
    import Cta from '$lib/components/landing/Cta.svelte'
    import Footer from '$lib/components/landing/Footer.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>{data.app_name} · Gestión de pichangas para comunidades</title>
    <meta
        name="description"
        content="App de código abierto para que los miembros de una comunidad se inscriban a las pichangas, los admins lleven el control y todos jueguen. Reemplazá el caos de WhatsApp."
    />
    <meta property="og:title" content="{data.app_name} · Volley Beauchef" />
    <meta
        property="og:description"
        content="Gestioná las pichangas de tu comunidad, sin caos de WhatsApp."
    />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
    <Navbar user={data.user} app_name={data.app_name} />
    <main class="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Contributors />
        <Cta />
    </main>
    <Footer app_name={data.app_name} />
</div>
