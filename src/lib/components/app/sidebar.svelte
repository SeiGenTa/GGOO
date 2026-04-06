<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar";
    import Button from "../ui/button/button.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Dialog from "$lib/components/ui/dialog";
    import { User, Key, Users, Volleyball, BadgeAlertIcon } from "@lucide/svelte/icons";
    import { toggleMode } from "mode-watcher";
    import { House } from "@lucide/svelte/icons";
    import { page } from "$app/state";

    const sections = [
        {
            title: "General",
            items: [
                {
                    icon: Volleyball,
                    label: "Pichangas",
                    href: "/app/pichangas",
                },
                {
                    icon: BadgeAlertIcon,
                    label: "Mis tarjetas",
                    href: "/app/tarjetas"
                },
            ],
        },
        {
            title: "Administración",
            items: [
                {
                    icon: User,
                    label: "Usuarios",
                    href: "/app/users"
                },
                {
                    icon: Key,
                    label: "Roles",
                    href: "/app/roles"
                },
                {
                    icon: Users,
                    label: "Permisos",
                    href: "/app/permissions"
                },
                {
                    icon: BadgeAlertIcon,
                    label: "Gestion de tarjetas",
                    href: "/app/gestion_tarjetas"
                },
            ],
        },
    ];
    interface userInfo {
        id: string;
        email: string;
        nombre: string;
        apodo: string | null;
        es_admin: boolean;
    }

    const { user }: { user: userInfo | undefined } = $props();

    let showCloseSessionDialog = $state(false);

    const isRouteActive = (href: string) => {
        if (href === "/app") {
            return page.url.pathname === "/app" || page.url.pathname === "/app/";
        }

        return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
    };
</script>

<Sidebar.Root variant="floating" collapsible="icon">
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton class="h-12" isActive={isRouteActive("/app")}>
                    {#snippet child({ props })}
                        <a href="/app" {...props}>
                            <House />
                            <div>
                                <h2 class="text-xl">GGOO</h2>
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
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton isActive={isRouteActive(item.href)}>
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
                    <Button variant="outline" class="w-full h-12 overflow-hidden" {...props}>
                        <div class="flex flex-row items-center gap-2 w-full">
                            <User class="mr-2" />
                            <div class="flex flex-col items-start">
                                <span class="text-sm font-medium">{user?.nombre}</span>
                                <span class="text-xs text-muted-foreground">{user?.email}</span>
                            </div>
                        </div>
                    </Button>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="min-w-40">
                <DropdownMenu.Item>
                    {#snippet child({ props })}
                        <a {...props} href="/app/profile"> Perfil </a>
                    {/snippet}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={toggleMode}>Cambiar tema</DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => (showCloseSessionDialog = true)}>Cerrar sesión</DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </Sidebar.Footer>
</Sidebar.Root>

<Dialog.Root bind:open={showCloseSessionDialog}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>¿Cerrar sesión?</Dialog.Title>
            <Dialog.Description>¿Estás seguro de que quieres cerrar sesión?</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <form method="POST" action="/auth?/logout">
                <Button type="submit" variant="destructive">Cerrar sesión</Button>
            </form>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
