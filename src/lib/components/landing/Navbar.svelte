<script lang="ts">
    import { Button } from '$lib/components/ui/button'
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
    import SunIcon from '@lucide/svelte/icons/sun'
    import MoonIcon from '@lucide/svelte/icons/moon'
    import MenuIcon from '@lucide/svelte/icons/menu'
    import XIcon from '@lucide/svelte/icons/x'
    import LogInIcon from '@lucide/svelte/icons/log-in'
    import LogOutIcon from '@lucide/svelte/icons/log-out'
    import UserIcon from '@lucide/svelte/icons/user'
    import VolleyballIcon from '@lucide/svelte/icons/volleyball'
    import { toggleMode } from 'mode-watcher'
    import logo from '/src/public/logo.jpg'

    interface UserInfo {
        id: string
        email: string
        nombre: string
        apodo: string | null
        es_admin: boolean
        permisos: number
        posiciones: string[]
        cumpleanos: Date | null
    }

    const {
        user,
        app_name,
    }: { user: UserInfo | null | undefined; app_name: string } = $props()

    let mobileOpen = $state(false)

    const sections = [
        { href: '#features', label: 'Funcionalidades' },
        { href: '#how-it-works', label: 'Cómo funciona' },
        { href: '#contributors', label: 'Contribuidores' },
    ]
</script>

<header
    class="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
    <div class="container mx-auto flex h-16 max-w-6xl items-center px-4">
        <a href="/" class="flex items-center gap-2">
            <img
                src={logo}
                alt="Logo {app_name}"
                class="h-9 w-9 rounded-lg border object-cover"
            />
            <div class="leading-tight">
                <p class="text-sm font-semibold">{app_name}</p>
                <p class="text-xs text-muted-foreground">Volley Beauchef</p>
            </div>
        </a>

        <nav class="ml-8 hidden items-center gap-1 md:flex">
            {#each sections as section (section.href)}
                <a
                    href={section.href}
                    class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    {section.label}
                </a>
            {/each}
        </nav>

        <div class="ml-auto flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onclick={toggleMode}
                aria-label="Cambiar tema"
            >
                <SunIcon
                    class="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                />
                <MoonIcon
                    class="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                />
            </Button>

            {#if user}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Button
                                variant="outline"
                                size="sm"
                                class="hidden md:inline-flex"
                                {...props}
                            >
                                <UserIcon class="mr-2 h-4 w-4" />
                                {user.nombre}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                class="md:hidden"
                                aria-label="Menú de usuario"
                                {...props}
                            >
                                <UserIcon class="h-4 w-4" />
                            </Button>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content class="min-w-48">
                        <DropdownMenu.Label class="font-normal">
                            <div class="flex flex-col">
                                <span class="text-sm font-medium"
                                    >{user.nombre}</span
                                >
                                <span class="text-xs text-muted-foreground"
                                    >{user.email}</span
                                >
                            </div>
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item>
                            {#snippet child({ props })}
                                <a {...props} href="/app">
                                    <VolleyballIcon class="mr-2 h-4 w-4" />
                                    Ir a la app
                                </a>
                            {/snippet}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item>
                            {#snippet child({ props })}
                                <a {...props} href="/app/profile">Perfil</a>
                            {/snippet}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                            onclick={toggleMode}
                            class="md:hidden"
                        >
                            <SunIcon class="mr-2 h-4 w-4 dark:hidden" />
                            <MoonIcon class="mr-2 h-4 w-4 hidden dark:block" />
                            Cambiar tema
                        </DropdownMenu.Item>
                        <DropdownMenu.Item>
                            {#snippet child({ props })}
                                <form
                                    method="POST"
                                    action="/auth?/logout"
                                    class="w-full"
                                >
                                    <button
                                        type="submit"
                                        {...props}
                                        class="flex w-full items-center text-destructive"
                                    >
                                        <LogOutIcon class="mr-2 h-4 w-4" />
                                        Cerrar sesión
                                    </button>
                                </form>
                            {/snippet}
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            {:else}
                <Button
                    variant="ghost"
                    size="sm"
                    href="/auth"
                    class="hidden sm:inline-flex"
                >
                    <LogInIcon class="mr-2 h-4 w-4" />
                    Iniciar sesión
                </Button>
                <Button size="sm" href="/auth/register">Registrarse</Button>
            {/if}

            <Button
                variant="ghost"
                size="icon"
                class="md:hidden"
                aria-label="Abrir menú"
                onclick={() => (mobileOpen = !mobileOpen)}
            >
                {#if mobileOpen}
                    <XIcon class="h-5 w-5" />
                {:else}
                    <MenuIcon class="h-5 w-5" />
                {/if}
            </Button>
        </div>
    </div>

    {#if mobileOpen}
        <div class="border-t border-border/40 bg-background md:hidden">
            <nav class="container mx-auto flex max-w-6xl flex-col gap-1 p-4">
                {#each sections as section (section.href)}
                    <a
                        href={section.href}
                        onclick={() => (mobileOpen = false)}
                        class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        {section.label}
                    </a>
                {/each}
                {#if !user}
                    <a
                        href="/auth"
                        onclick={() => (mobileOpen = false)}
                        class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        Iniciar sesión
                    </a>
                {/if}
            </nav>
        </div>
    {/if}
</header>
