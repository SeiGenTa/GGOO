<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit'
    import { enhance } from '$app/forms'
    import { toast } from 'svelte-sonner'
    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import { Badge } from '$lib/components/ui/badge'
    import Switch from '$lib/components/ui/switch/switch.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
    type UserRow = PageProps['data']['users'][number]

    let isAssignDialogOpen = $state(false)
    let selectedUser = $state<UserRow | null>(null)

    const buildPageHref = (targetPage: number) => {
        const params = new URLSearchParams()
        const q = data.filters?.q ?? ''
        const sortBy = data.filters?.sortBy ?? 'nombre'
        const sortDir = data.filters?.sortDir ?? 'asc'
        const roleIds = (data.filters?.selectedRoleIds ?? []) as string[]

        if (q.length > 0) {
            params.set('q', q)
        }

        params.set('sortBy', sortBy)
        params.set('sortDir', sortDir)

        for (const roleId of roleIds) {
            params.append('roleId', roleId)
        }

        params.set('page', String(targetPage))
        return `/app/roles?${params.toString()}`
    }

    const openAssignDialog = (user: UserRow) => {
        selectedUser = user
        isAssignDialogOpen = true
    }

    const toggleSuperUser = (userId: string) => {
        const form = document.getElementById(
            `super-user-form-${userId}`
        ) as HTMLFormElement | null
        if (form) {
            form.requestSubmit()
        }
    }

    const withFeedback = (successTitle: string): SubmitFunction => {
        return () => {
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    const message =
                        (result.data as { message?: string } | null)?.message ??
                        'Cambios guardados correctamente.'
                    toast(successTitle, { description: message })
                    isAssignDialogOpen = false
                    selectedUser = null
                    await update()
                    return
                }

                if (result.type === 'failure') {
                    const message =
                        (result.data as { message?: string } | null)?.message ??
                        'No fue posible guardar los cambios.'
                    toast('Error', { description: message })
                    await update()
                    return
                }

                await update()
            }
        }
    }
</script>

<section class="space-y-6">
    {#if data.blocked}
        <Card.Root>
            <Card.Header>
                <Card.Title>Sin permisos para ver esta sección</Card.Title>
                <Card.Description>
                    Necesitas permisos para ver o asignar roles de usuario.
                </Card.Description>
            </Card.Header>
        </Card.Root>
    {:else}
        <Card.Root>
            <Card.Header>
                <Card.Title>Asignación de roles por usuario</Card.Title>
                <Card.Description>
                    Busca usuarios, ordénalos y filtra por roles. La asignación
                    se realiza desde un diálogo.
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <form method="GET" class="grid gap-3 lg:grid-cols-4">
                    <div class="lg:col-span-2">
                        <label
                            class="mb-1 block text-sm font-medium"
                            for="search-users">Buscar usuarios</label
                        >
                        <Input
                            id="search-users"
                            name="q"
                            value={data.filters?.q ?? ''}
                            placeholder="Nombre, email o id"
                        />
                    </div>

                    <div>
                        <label
                            class="mb-1 block text-sm font-medium"
                            for="sort-by">Ordenar por</label
                        >
                        <select
                            id="sort-by"
                            name="sortBy"
                            class="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option
                                value="nombre"
                                selected={(data.filters?.sortBy ?? 'nombre') ===
                                    'nombre'}>Nombre</option
                            >
                            <option
                                value="id"
                                selected={(data.filters?.sortBy ?? 'nombre') ===
                                    'id'}>ID</option
                            >
                        </select>
                    </div>

                    <div>
                        <label
                            class="mb-1 block text-sm font-medium"
                            for="sort-dir">Dirección</label
                        >
                        <select
                            id="sort-dir"
                            name="sortDir"
                            class="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option
                                value="asc"
                                selected={(data.filters?.sortDir ?? 'asc') ===
                                    'asc'}>Ascendente</option
                            >
                            <option
                                value="desc"
                                selected={(data.filters?.sortDir ?? 'asc') ===
                                    'desc'}>Descendente</option
                            >
                        </select>
                    </div>

                    <div class="lg:col-span-4 rounded-md border p-3">
                        <p class="mb-2 text-sm font-medium">
                            Filtrar por roles
                        </p>
                        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {#each data.roles as role}
                                <label
                                    class="flex items-center gap-2 rounded-md border p-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        name="roleId"
                                        value={role.id}
                                        checked={(
                                            (data.filters?.selectedRoleIds ??
                                                []) as string[]
                                        ).includes(role.id)}
                                    />
                                    <span>{role.nombre}</span>
                                </label>
                            {/each}
                        </div>
                    </div>

                    <div class="lg:col-span-4 flex flex-wrap gap-2">
                        <Button type="submit">Aplicar filtros</Button>
                        <Button href="/app/roles" variant="outline"
                            >Limpiar</Button
                        >
                    </div>
                </form>
            </Card.Content>
        </Card.Root>

        {#if data.roles.length === 0}
            <Card.Root>
                <Card.Header>
                    <Card.Title>No hay roles disponibles</Card.Title>
                    <Card.Description>
                        Primero crea roles en la vista de permisos para poder
                        asignarlos a usuarios.
                    </Card.Description>
                </Card.Header>
            </Card.Root>
        {/if}

        <Card.Root>
            <Card.Content class="p-0">
                <div class="grid gap-3 p-4 lg:hidden">
                    {#if data.users.length === 0}
                        <div
                            class="rounded-lg border p-6 text-center text-sm text-muted-foreground"
                        >
                            No se encontraron usuarios con los filtros actuales.
                        </div>
                    {:else}
                        {#each data.users as user}
                            <div
                                class="rounded-xl border bg-card p-4 shadow-sm"
                            >
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="min-w-0">
                                        <p class="truncate font-semibold">
                                            {user.nombre}
                                        </p>
                                        <p
                                            class="truncate text-xs text-muted-foreground"
                                        >
                                            {user.email}
                                        </p>
                                        <p
                                            class="mt-1 text-xs text-muted-foreground"
                                        >
                                            {user.apodo ?? 'Sin apodo'}
                                        </p>
                                        <div
                                            class="mt-2 flex flex-wrap gap-1.5"
                                        >
                                            {#if user.es_admin}
                                                <Badge>Super usuario</Badge>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5">
                                        {#if user.roles.length === 0}
                                            <Badge variant="outline"
                                                >Sin roles</Badge
                                            >
                                        {:else}
                                            {#each user.roles as role}
                                                <Badge>{role.nombre}</Badge>
                                            {/each}
                                        {/if}
                                    </div>
                                </div>

                                <div
                                    class="mt-3 flex items-center justify-between gap-2"
                                >
                                    <div class="text-xs text-muted-foreground">
                                        {user.roles.length} roles asignados
                                    </div>
                                    <Button
                                        onclick={() => openAssignDialog(user)}
                                        size="sm">Asignar roles</Button
                                    >
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>

                <div class="hidden overflow-x-auto lg:block">
                    <table class="w-full min-w-330 text-sm">
                        <thead>
                            <tr class="border-b bg-muted/30 text-left">
                                <th class="px-4 py-3 font-semibold">ID</th>
                                <th class="px-4 py-3 font-semibold">Nombre</th>
                                <th class="px-4 py-3 font-semibold">Email</th>
                                <th class="px-4 py-3 font-semibold">Apodo</th>
                                <th class="px-4 py-3 font-semibold">Estado</th>
                                <th class="px-4 py-3 font-semibold">Roles</th>
                                <th class="px-4 py-3 font-semibold">Acciones</th
                                >
                            </tr>
                        </thead>
                        <tbody>
                            {#if data.users.length === 0}
                                <tr>
                                    <td
                                        colspan="7"
                                        class="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        No se encontraron usuarios con los
                                        filtros actuales.
                                    </td>
                                </tr>
                            {:else}
                                {#each data.users as user}
                                    <tr class="border-b align-top">
                                        <td class="px-4 py-3 font-mono text-xs"
                                            >{user.id}</td
                                        >
                                        <td class="px-4 py-3 font-medium"
                                            >{user.nombre}</td
                                        >
                                        <td class="px-4 py-3">{user.email}</td>
                                        <td class="px-4 py-3"
                                            >{user.apodo ?? '-'}</td
                                        >
                                        <td class="px-4 py-3">
                                            {#if user.es_admin}
                                                <Badge>Super usuario</Badge>
                                            {:else}
                                                <Badge variant="outline"
                                                    >Normal</Badge
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-4 py-3">
                                            <div class="flex flex-wrap gap-1.5">
                                                {#if user.roles.length === 0}
                                                    <Badge variant="outline"
                                                        >Sin roles</Badge
                                                    >
                                                {:else}
                                                    {#each user.roles as role}
                                                        <Badge
                                                            >{role.nombre}</Badge
                                                        >
                                                    {/each}
                                                {/if}
                                            </div>
                                        </td>
                                        <td class="px-4 py-3">
                                            <Button
                                                onclick={() =>
                                                    openAssignDialog(user)}
                                                size="sm">Asignar roles</Button
                                            >
                                        </td>
                                    </tr>
                                {/each}
                            {/if}
                        </tbody>
                    </table>
                </div>
                <div
                    class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm"
                >
                    <p class="text-muted-foreground">
                        Mostrando página {data.pagination?.page ?? 1} de {data
                            .pagination?.totalPages ?? 1}. Total usuarios: {data
                            .pagination?.totalItems ?? 0}
                    </p>
                    <div class="flex items-center gap-2">
                        <Button
                            href={buildPageHref(
                                Math.max(1, (data.pagination?.page ?? 1) - 1)
                            )}
                            variant="outline"
                            disabled={!data.pagination?.hasPrev}
                            size="sm"
                        >
                            Anterior
                        </Button>
                        <Button
                            href={buildPageHref(
                                Math.min(
                                    data.pagination?.totalPages ?? 1,
                                    (data.pagination?.page ?? 1) + 1
                                )
                            )}
                            variant="outline"
                            disabled={!data.pagination?.hasNext}
                            size="sm"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}
</section>

<Dialog.Root bind:open={isAssignDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Asignar roles</Dialog.Title>
            <Dialog.Description>
                {#if selectedUser}
                    Usuario: {selectedUser.nombre} ({selectedUser.email})
                {:else}
                    Selecciona un usuario para editar sus roles.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedUser}
            <form
                method="POST"
                action="?/assign_roles"
                id="assign-roles-form"
                class="space-y-4"
                use:enhance={withFeedback('Roles actualizados')}
            >
                <input type="hidden" name="userId" value={selectedUser.id} />

                <div class="grid gap-2 sm:grid-cols-2">
                    {#each data.roles as role}
                        <label
                            class="flex items-center gap-2 rounded-md border p-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                name="roles"
                                value={role.id}
                                checked={selectedUser.selectedRoleIds.includes(
                                    role.id
                                )}
                            />
                            <span>{role.nombre}</span>
                        </label>
                    {/each}
                </div>
            </form>

            {#if data.currentUserIsAdmin}
                <div class="rounded-md border p-3">
                    <p class="mb-2 text-sm font-medium">Super usuario</p>
                    <form
                        action="?/set_super_user"
                        class="flex items-center justify-between gap-3"
                        id={`super-user-form-${selectedUser.id}`}
                        method="POST"
                        use:enhance={withFeedback(
                            selectedUser.es_admin
                                ? 'Super usuario desactivado'
                                : 'Super usuario activado'
                        )}
                    >
                        <input
                            type="hidden"
                            name="userId"
                            value={selectedUser.id}
                        />
                        <input
                            type="hidden"
                            name="es_admin"
                            value={selectedUser.es_admin ? 'false' : 'true'}
                        />
                        <p class="text-sm text-muted-foreground">
                            {selectedUser.es_admin
                                ? 'El usuario tiene todos los permisos del sistema.'
                                : 'Activar para otorgar todos los permisos automáticamente.'}
                        </p>
                        <Switch
                            checked={selectedUser.es_admin}
                            onCheckedChange={() =>
                                toggleSuperUser(selectedUser!.id)}
                        />
                    </form>
                </div>
            {/if}
        {/if}

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button
                type="submit"
                form="assign-roles-form"
                disabled={!selectedUser}>Guardar</Button
            >
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
