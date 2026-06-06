<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit'
    import { enhance } from '$app/forms'
    import { toast } from 'svelte-sonner'
    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import { Badge } from '$lib/components/ui/badge'
    import { Label } from '$lib/components/ui/label'
    import Switch from '$lib/components/ui/switch/switch.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    type RoleRow = PageProps['data']['roles'][number]
    type RolePermission = string

    let createDialogOpen = $state(false)
    let editDialogOpen = $state(false)
    let selectedRole = $state<RoleRow | null>(null)
    let createRolePermissions = $state<RolePermission[]>([])
    let editRolePermissions = $state<RolePermission[]>([])
    let editRoleName = $state('')

    const labels: Record<string, string> = {
        ver_partidos: 'Ver partidos',
        crear_partidos: 'Crear partidos',
        editar_partidos: 'Editar partidos',
        inscribirse_pichanga: 'Inscribirse en pichanga',
        crear_roles: 'Crear roles',
        editar_roles: 'Editar roles',
        eliminar_roles: 'Eliminar roles',
        ver_roles_usuarios: 'Ver roles de usuarios',
        asignar_roles: 'Asignar roles',
    }

    const getPermissionLabel = (permission: string) =>
        labels[permission] ?? permission

    const withFeedback = (successTitle: string): SubmitFunction => {
        return () => {
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    const message =
                        (result.data as { message?: string } | null)?.message ??
                        'Operación realizada correctamente.'
                    toast(successTitle, { description: message })
                    createDialogOpen = false
                    editDialogOpen = false
                    selectedRole = null
                    createRolePermissions = []
                    editRolePermissions = []
                    editRoleName = ''
                    await update()
                    return
                }

                if (result.type === 'failure') {
                    const message =
                        (result.data as { message?: string } | null)?.message ??
                        'No fue posible completar la acción.'
                    toast('Error', { description: message })
                    await update()
                    return
                }

                await update()
            }
        }
    }

    const openCreateDialog = () => {
        createRolePermissions = []
        createDialogOpen = true
    }

    const openEditDialog = (role: RoleRow) => {
        selectedRole = role
        editRoleName = role.nombre
        editRolePermissions = [...role.permisos]
        editDialogOpen = true
    }

    const toggleDefaultRole = (roleId: string) => {
        const form = document.getElementById(
            `default-role-form-${roleId}`
        ) as HTMLFormElement | null
        if (form) {
            form.requestSubmit()
        }
    }
</script>

<section class="space-y-6 p-4">
    {#if data.blocked}
        <Card.Root>
            <Card.Header>
                <Card.Title>Sin permisos para administrar roles</Card.Title>
                <Card.Description
                    >Necesitas permisos de administración de roles para acceder
                    a esta sección.</Card.Description
                >
            </Card.Header>
        </Card.Root>
    {:else}
        <Card.Root class="shadow-sm">
            <Card.Header>
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <Card.Title>Roles y permisos</Card.Title>
                        <Card.Description
                            >Administra los roles del sistema desde tarjetas
                            adaptadas a móvil.</Card.Description
                        >
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onclick={openCreateDialog}>Crear rol</Button
                    >
                </div>
            </Card.Header>
        </Card.Root>

        {#if data.roles.length === 0}
            <Card.Root>
                <Card.Header>
                    <Card.Title>No hay roles creados</Card.Title>
                    <Card.Description
                        >Crea el primer rol para empezar a asignar permisos.</Card.Description
                    >
                </Card.Header>
            </Card.Root>
        {/if}

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {#each data.roles as role}
                <Card.Root class="shadow-sm">
                    <Card.Header>
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <Card.Title class="truncate"
                                    >{role.nombre}</Card.Title
                                >
                                <Card.Description>
                                    <span
                                        class="inline-flex flex-wrap items-center gap-2"
                                    >
                                        <Badge variant="outline"
                                            >{role.users_count} usuarios</Badge
                                        >
                                        <span
                                            >{role.permisos.length} permisos</span
                                        >
                                        {#if role.is_default}
                                            <Badge>Predeterminado</Badge>
                                        {/if}
                                    </span>
                                </Card.Description>
                            </div>
                            <div class="flex items-center gap-2">
                                <Label class="text-xs text-muted-foreground"
                                    >Default</Label
                                >
                                <form
                                    action="?/set_predeterminated"
                                    class="flex items-center gap-2"
                                    id={`default-role-form-${role.id}`}
                                    method="POST"
                                    use:enhance={withFeedback(
                                        'Rol predeterminado actualizado'
                                    )}
                                >
                                    <input
                                        type="hidden"
                                        name="roleId"
                                        value={role.id}
                                    />
                                    <input
                                        type="hidden"
                                        name="is_default"
                                        value={role.is_default
                                            ? 'false'
                                            : 'true'}
                                    />
                                    <Switch
                                        checked={role.is_default}
                                        onCheckedChange={() =>
                                            toggleDefaultRole(role.id)}
                                    />
                                </form>
                            </div>
                        </div>
                    </Card.Header>

                    <Card.Content class="space-y-4">
                        <div class="flex flex-wrap gap-1.5">
                            {#if role.permisos.length === 0}
                                <Badge variant="outline">Sin permisos</Badge>
                            {:else}
                                {#each role.permisos as permission}
                                    <Badge variant="secondary"
                                        >{getPermissionLabel(permission)}</Badge
                                    >
                                {/each}
                            {/if}
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={() => openEditDialog(role)}
                                >Editar</Button
                            >
                            <form
                                method="POST"
                                action="?/delete_role"
                                use:enhance={withFeedback('Rol eliminado')}
                            >
                                <input
                                    type="hidden"
                                    name="roleId"
                                    value={role.id}
                                />
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm">Eliminar</Button
                                >
                            </form>
                        </div>
                    </Card.Content>
                </Card.Root>
            {/each}
        </div>
    {/if}
</section>

<!-- Crear rol -->
<Dialog.Root bind:open={createDialogOpen}>
    <Dialog.Content class="flex max-h-[90dvh] flex-col overflow-hidden">
        <Dialog.Header>
            <Dialog.Title>Crear nuevo rol</Dialog.Title>
            <Dialog.Description
                >Define un nombre y selecciona los permisos que tendrá este rol.</Dialog.Description
            >
        </Dialog.Header>

        <form
            method="POST"
            action="?/create_role"
            id="create-role-form"
            class="contents"
            use:enhance={withFeedback('Rol creado')}
        >
            <div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
                <div class="space-y-2">
                    <label class="text-sm font-medium" for="new-role-name"
                        >Nombre del rol</label
                    >
                    <Input
                        id="new-role-name"
                        name="nombre"
                        placeholder="Ej: Moderador"
                        required
                    />
                </div>

                <div class="space-y-3">
                    <p class="text-sm font-medium">Permisos del rol</p>
                    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {#each data.permissions as permission}
                            <label
                                class="flex items-center gap-2 rounded-md border p-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    name="permisos"
                                    value={permission}
                                    bind:group={createRolePermissions}
                                />
                                <span>{getPermissionLabel(permission)}</span>
                            </label>
                        {/each}
                    </div>
                </div>
            </div>

            <Dialog.Footer class="pt-2">
                <Dialog.Close>
                    <Button variant="outline" type="button">Cancelar</Button>
                </Dialog.Close>
                <Button type="submit">Crear rol</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<!-- Editar rol -->
<Dialog.Root bind:open={editDialogOpen}>
    <Dialog.Content class="flex max-h-[90dvh] flex-col overflow-hidden">
        <Dialog.Header>
            <Dialog.Title>Editar rol</Dialog.Title>
            <Dialog.Description>
                {#if selectedRole}
                    Ajusta el nombre y los permisos del rol.
                {:else}
                    Selecciona un rol para editarlo.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedRole}
            <form
                method="POST"
                action="?/update_role"
                id="edit-role-form"
                class="contents"
                use:enhance={withFeedback('Rol actualizado')}
            >
                <input type="hidden" name="roleId" value={selectedRole.id} />

                <div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
                    <div class="space-y-2">
                        <label
                            class="text-sm font-medium"
                            for={`name-${selectedRole.id}`}>Nombre</label
                        >
                        <Input
                            id={`name-${selectedRole.id}`}
                            name="nombre"
                            bind:value={editRoleName}
                            required
                        />
                    </div>

                    <div class="space-y-3">
                        <p class="text-sm font-medium">Permisos disponibles</p>
                        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {#each data.permissions as permission}
                                <label
                                    class="flex items-center gap-2 rounded-md border p-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        name="permisos"
                                        value={permission}
                                        bind:group={editRolePermissions}
                                    />
                                    <span>{getPermissionLabel(permission)}</span
                                    >
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>

                <Dialog.Footer class="pt-2">
                    <Dialog.Close>
                        <Button variant="outline" type="button">Cancelar</Button
                        >
                    </Dialog.Close>
                    <Button type="submit">Guardar cambios</Button>
                </Dialog.Footer>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>
