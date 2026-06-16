<script lang="ts">
    import { Separator } from '$lib/components/ui/separator'
    import GithubIcon from '@lucide/svelte/icons/code-xml'
    import FileTextIcon from '@lucide/svelte/icons/file-text'
    import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
    import VolleyballIcon from '@lucide/svelte/icons/volleyball'
    import logo from '/src/public/logo.jpg'

    const { app_name }: { app_name: string } = $props()
    const year = new Date().getFullYear()
</script>

<footer class="border-t border-border/40 bg-muted/30">
    <div class="container mx-auto max-w-6xl px-4 py-12">
        <div
            class="grid gap-8 md:grid-cols-2 md:items-start md:justify-between"
        >
            <div class="max-w-sm">
                <a href="/" class="inline-flex items-center gap-2">
                    <img
                        src={logo}
                        alt="Logo {app_name}"
                        class="h-9 w-9 rounded-lg border object-cover"
                    />
                    <span class="text-base font-semibold">{app_name}</span>
                </a>
                <p class="mt-3 text-sm text-muted-foreground">
                    App de código abierto para gestionar las pichangas y los
                    miembros de comunidades deportivas, hecha con cariño por la
                    comunidad Volley Beauchef.
                </p>
            </div>

            <nav class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <a
                    href="https://github.com/SeiGenTa/GGOO"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <GithubIcon class="h-4 w-4" />
                    Repositorio en GitHub
                </a>
                <a
                    href="https://github.com/SeiGenTa/GGOO/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <FileTextIcon class="h-4 w-4" />
                    Documentación
                </a>
                <a
                    href="https://github.com/SeiGenTa/GGOO/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <VolleyballIcon class="h-4 w-4" />
                    Licencia MIT
                </a>
                <a
                    href="https://github.com/SeiGenTa/GGOO/issues?q=is%3Aissue+%5BERROR%5D"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <TriangleAlertIcon class="h-4 w-4" />
                    Reportar un error
                </a>
            </nav>
        </div>

        <Separator class="my-8" />

        <div
            class="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row"
        >
            <p>&copy; {year} {app_name} · Licencia MIT</p>
            <p>Construido con SvelteKit, Prisma y PostgreSQL.</p>
        </div>
    </div>
</footer>
