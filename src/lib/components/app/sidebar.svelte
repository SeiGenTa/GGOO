<script lang="ts">
    import * as Sidebar from '$lib/components/ui/sidebar'
    import Button from '../ui/button/button.svelte'
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
    import * as Dialog from '$lib/components/ui/dialog'
    import {
        User,
        Key,
        Users,
        Volleyball,
        BadgeAlertIcon,
        ChartNoAxesColumn,
    } from '@lucide/svelte/icons'
    import { toggleMode } from 'mode-watcher'
    import { page } from '$app/state'
    import * as Item from '$lib/components/ui/item'
    import { Permissions, PERMISSION_BITS, tienePermiso } from '$lib/permissions'

    interface userInfo {
        id: string
        email: string
        nombre: string
        apodo: string | null
        es_admin: boolean
        /**
         * Bitmask de permisos del usuario. Ver `$lib/server/permissions`.
         * El servidor envía un único entero en lugar del array de strings.
         */
        permisos: number
    }

    const { user, app_name }: { user: userInfo | undefined; app_name: string } =
        $props()

    /**
     * Items del sidebar.
     *
     * `permiso: null` significa "ruta siempre visible para cualquier
     * usuario autenticado" (p. ej. la vista personal de tarjetas, que
     * no requiere un permiso del enum). Cualquier otro valor debe
     * pertenecer al enum `Permissions`.
     */
    type SidebarItem = {
        icon: typeof Volleyball
        label: string
        href: string
        permiso: Permissions | null
    }

    type SidebarSection = {
        title: string
        items: SidebarItem[]
    }

    const allSections: SidebarSection[] = [
        {
            title: 'General',
            items: [
                {
                    icon: Volleyball,
                    label: 'Pichangas',
                    href: '/app/pichangas',
                    permiso: Permissions.VerPartidos,
                },
                {
                    icon: BadgeAlertIcon,
                    label: 'Mis tarjetas',
                    href: '/app/tarjetas',
                    permiso: null,
                },
            ],
        },
        {
            title: 'Administración',
            items: [
                {
                    icon: User,
                    label: 'Usuarios',
                    href: '/app/users',
                    permiso: Permissions.VerMiembros,
                },
                {
                    icon: Key,
                    label: 'Roles',
                    href: '/app/roles',
                    permiso: Permissions.VerRolesUsuarios,
                },
                {
                    icon: Users,
                    label: 'Permisos',
                    href: '/app/permissions',
                    permiso: Permissions.EditarRoles,
                },
                {
                    icon: BadgeAlertIcon,
                    label: 'Gestion de tarjetas',
                    href: '/app/gestion_tarjetas',
                    permiso: Permissions.VerTarjetas,
                },
                {
                    icon: ChartNoAxesColumn,
                    label: 'Jugadores',
                    href: '/app/jugadores',
                    permiso: Permissions.VerEstadisticas,
                },
            ],
        },
    ]

    /**
     * Chequeo de visibilidad de un item del sidebar.
     *
     * Si el item no requiere permiso -> siempre visible.
     * Si el usuario es admin -> siempre visible.
     * Si el usuario no está autenticado -> no visible.
     * En otro caso -> verificación O(1) con AND a nivel de bits sobre
     * el bitmask que llega del servidor.
     */
    const canSeeItem = (item: SidebarItem): boolean => {
        if (item.permiso === null) return true
        if (!user) return false
        if (user.es_admin) return true
        return tienePermiso(user.permisos, PERMISSION_BITS[item.permiso])
    }

    /**
     * Derivamos en dos pasos para mantener la lógica clara:
     *   1. `sectionsWithItems`: descartamos los items individuales que
     *      el usuario no puede ver.
     *   2. `sections`: descartamos los grupos cuyo `Sidebar.Menu` ha
     *      quedado sin hijos. Así un usuario sin permisos de admin
     *      nunca ve el header "Administración".
     */
    const sectionsWithItems = $derived(
        allSections.map((section) => ({
            ...section,
            items: section.items.filter(canSeeItem),
        }))
    )

    const sections = $derived(
        sectionsWithItems.filter((section) => section.items.length > 0)
    )

    let showCloseSessionDialog = $state(false)

    const isRouteActive = (href: string) => {
        if (href === '/app') {
            return false
        }

        return (
            page.url.pathname === href ||
            page.url.pathname.startsWith(`${href}/`)
        )
    }

    import { useSidebar } from '$lib/components/ui/sidebar/index.js'
    const sidebar = useSidebar()

    import logo from '/src/public/logo.jpg'
</script>

<Sidebar.Root variant="floating" collapsible="icon" class="h-screen">
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton
                    class="h-12"
                    isActive={isRouteActive('/app')}
                >
                    {#snippet child({ props })}
                        <a href="/app" {...props}>
                            <img
                                src={logo}
                                alt="Volley Beauchef Logo"
                                class="w-8 h-8 mr-2 border rounded-lg object-cover"
                            />
                            <div>
                                <h2 class="text-xl">{app_name}</h2>
                                <h3>Gestión de pichangas</h3>
                            </div>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>
    <Sidebar.Content>
        {#each sections as section}
            <Sidebar.Group>
                <Sidebar.GroupLabel>{section.title}</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                    <Sidebar.Menu>
                        {#each section.items as item}
                            {#if canSeeItem(item)}
                                <Sidebar.MenuItem>
                                    <Sidebar.MenuButton
                                        isActive={isRouteActive(item.href)}
                                    >
                                        {#snippet child({ props })}
                                            <a href={item.href} {...props}>
                                                {#if item.icon}
                                                    <item.icon />
                                                {/if}
                                                {item.label}
                                            </a>
                                        {/snippet}
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuItem>
                            {/if}
                        {/each}
                    </Sidebar.Menu>
                </Sidebar.GroupContent>
            </Sidebar.Group>
        {/each}
    </Sidebar.Content>
    <Sidebar.Footer>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <Item.Root
                        variant="outline"
                        size="sm"
                        class="w-full flex"
                        {...props}
                    >
                        <Item.Media>
                            <User class="size-5" />
                        </Item.Media>
                        {#if sidebar.open}
                            <Item.Content class="">
                                <Item.Title>{user?.nombre}</Item.Title>
                                <Item.Description
                                    >{user?.apodo}
                                    {user?.es_admin
                                        ? '(Admin)'
                                        : ''}</Item.Description
                                >
                            </Item.Content>
                        {/if}
                    </Item.Root>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="min-w-40">
                <DropdownMenu.Item>
                    {#snippet child({ props })}
                        <a {...props} href="/app/profile"> Perfil </a>
                    {/snippet}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={toggleMode}
                    >Cambiar tema</DropdownMenu.Item
                >
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                    onSelect={() => (showCloseSessionDialog = true)}
                    >Cerrar sesión</DropdownMenu.Item
                >
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </Sidebar.Footer>
</Sidebar.Root>

<Dialog.Root bind:open={showCloseSessionDialog}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>¿Cerrar sesión?</Dialog.Title>
            <Dialog.Description
                >¿Estás seguro de que quieres cerrar sesión?</Dialog.Description
            >
        </Dialog.Header>
        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <form method="POST" action="/auth?/logout">
                <Button type="submit" variant="destructive"
                    >Cerrar sesión</Button
                >
            </form>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
