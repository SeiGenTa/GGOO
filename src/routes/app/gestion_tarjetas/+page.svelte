<script lang="ts">
    import type { SubmitFunction } from "@sveltejs/kit";
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import SelectApp from "$lib/components/app/select.svelte";
    import type { PageProps } from "./$types";

    type ComplaintRow = {
        id: string;
        razon: string;
        fechaReclamo: string | Date;
        atendido: boolean;
        respuesta: string | null;
        administradorAtendio: {
            id: string;
            nombre: string;
            apodo: string | null;
        } | null;
    } | null;

    type TarjetaRow = {
        id: string;
        userId: string;
        quienAsignoId: string | null;
        persona: string;
        personaEmail: string | null;
        asignadoPor: string;
        asignadoPorEmail: string | null;
        tipo: string;
        razon: string;
        fechaCreacion: string | Date;
        venceEn: string | Date;
        usado: boolean;
        vencida: boolean;
        complaint: ComplaintRow;
    };

    type PageData = PageProps["data"] & {
        tarjetas: TarjetaRow[];
        canResolveComplaints: boolean;
    };

    let { data }: { data: PageData } = $props();

    let isCreateDialogOpen = $state(false);
    let helpDialogOpen = $state(false);
    let complaintReviewDialogOpen = $state(false);
    let personaSearch = $state("");
    let asignadoPorSearch = $state("");
    let createPersonaSearch = $state("");
    let selectedUserIds = $state<string[]>([]);
    let selectedAssignedByIds = $state<string[]>([]);
    let selectedComplaint = $state<ComplaintRow>(null);
    let complaintDecision = $state<"reject" | "use">("reject");
    let complaintResponse = $state("");

    $effect(() => {
        selectedUserIds = [...(data.filters?.userIds ?? [])];
        selectedAssignedByIds = [...(data.filters?.assignedByIds ?? [])];
    });

    const formatUserLabel = (user: { apodo: string | null; nombre: string }) => {
        if (user.apodo && user.apodo.trim().length > 0) {
            return `${user.apodo} (${user.nombre})`;
        }

        return user.nombre;
    };

    const matchUserSearch = (user: { apodo: string | null; nombre: string; email: string }, search: string) => {
        const term = search.trim().toLowerCase();
        if (term.length === 0) {
            return true;
        }

        const label = formatUserLabel(user).toLowerCase();
        return (
            label.includes(term) ||
            user.email.toLowerCase().includes(term)
        );
    };

    const buildUserOptions = (search: string, selectedIds: string[]) => {
        return data.userOptions
            .filter((user) => matchUserSearch(user, search) || selectedIds.includes(user.id))
            .map((user) => ({
                value: user.id,
                label: formatUserLabel(user),
            }));
    };

    const personaOptions = $derived(buildUserOptions(personaSearch, selectedUserIds));

    const asignadoPorOptions = $derived(buildUserOptions(asignadoPorSearch, selectedAssignedByIds));

    const withFeedback = (successTitle: string, closeCreate = false): SubmitFunction => {
        return () => {
            return async ({ result, update }) => {
                if (result.type === "success") {
                    const message = (result.data as { message?: string } | null)?.message ?? "Operación completada correctamente.";
                    toast(successTitle, { description: message });

                    if (closeCreate) {
                        isCreateDialogOpen = false;
                    }

                    await update();
                    return;
                }

                if (result.type === "failure") {
                    const message = (result.data as { message?: string } | null)?.message ?? "No fue posible completar la acción.";
                    toast("Error", { description: message });
                    await update();
                    return;
                }

                await update();
            };
        };
    };

    const toUTCISOString = (value: FormDataEntryValue | null) => {
        if (typeof value !== "string" || value.trim().length === 0) {
            return "";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "";
        }

        return parsed.toISOString();
    };

    const withUTCDateFields = (fields: string[], successTitle: string, closeCreate = false): SubmitFunction => {
        return ({ formData }) => {
            for (const field of fields) {
                const iso = toUTCISOString(formData.get(field));
                if (iso.length > 0) {
                    formData.set(field, iso);
                }
            }

            return async ({ result, update }) => {
                if (result.type === "success") {
                    const message = (result.data as { message?: string } | null)?.message ?? "Operación completada correctamente.";
                    toast(successTitle, { description: message });

                    if (closeCreate) {
                        isCreateDialogOpen = false;
                    }

                    await update();
                    return;
                }

                if (result.type === "failure") {
                    const message = (result.data as { message?: string } | null)?.message ?? "No fue posible completar la acción.";
                    toast("Error", { description: message });
                    await update();
                    return;
                }

                await update();
            };
        };
    };

    const openComplaintReviewDialog = (complaint: ComplaintRow) => {
        selectedComplaint = complaint;
        complaintDecision = "reject";
        complaintResponse = complaint?.respuesta ?? "";
        complaintReviewDialogOpen = true;
    };

    const complaintStatusLabel = (card: TarjetaRow) => {
        if (card.complaint) {
            return card.complaint.atendido ? "Reclamo resuelto" : "Reclamo pendiente";
        }

        return "Sin reclamo";
    };

    const getCardTypeBadgeClass = (tipo: string) => {
        if (tipo === "amarilla") {
            return "border-yellow-300 bg-yellow-300 text-yellow-950 hover:bg-yellow-300/90";
        }

        return "";
    };

    const toDateTimeLocalInput = (value: string | Date) => {
        const date = new Date(value);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const h = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${d}T${h}:${min}`;
    };

    const submitFilters = async (event: SubmitEvent) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const formData = new FormData(form);

        const dateFields = ["venceEnDesde", "venceEnHasta"];
        for (const field of dateFields) {
            const iso = toUTCISOString(formData.get(field));
            if (iso.length > 0) {
                formData.set(field, iso);
            } else {
                formData.delete(field);
            }
        }

        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            if (typeof value !== "string") {
                continue;
            }

            const trimmed = value.trim();
            if (trimmed.length === 0) {
                continue;
            }

            params.append(key, trimmed);
        }

        await goto(`/app/gestion_tarjetas?${params.toString()}`);
    };

    const buildPageHref = (targetPage: number) => {
        const params = new URLSearchParams();

        const q = data.filters?.q ?? "";
        const userIds = data.filters?.userIds ?? [];
        const assignedByIds = data.filters?.assignedByIds ?? [];
        const tipo = data.filters?.tipo ?? "";
        const usado = data.filters?.usado ?? "";
        const venceEnDesde = data.filters?.venceEnDesde ?? "";
        const venceEnHasta = data.filters?.venceEnHasta ?? "";
        const orderBy = data.filters?.orderBy ?? "createdAt";
        const orderDir = data.filters?.orderDir ?? "desc";

        if (q.length > 0) {
            params.set("q", q);
        }

        for (const userId of userIds) {
            params.append("userId", userId);
        }

        for (const assignedById of assignedByIds) {
            params.append("assignedById", assignedById);
        }

        if (tipo.length > 0) {
            params.set("tipo", tipo);
        }

        if (usado.length > 0) {
            params.set("usado", usado);
        }

        if (venceEnDesde.length > 0) {
            params.set("venceEnDesde", venceEnDesde);
        }

        if (venceEnHasta.length > 0) {
            params.set("venceEnHasta", venceEnHasta);
        }

        params.set("orderBy", orderBy);
        params.set("orderDir", orderDir);
        params.set("page", String(targetPage));

        return `/app/gestion_tarjetas?${params.toString()}`;
    };

    const formatDate = (value: string | Date) => {
        return new Date(value).toLocaleString("es-CL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
</script>

<div class="container mx-auto space-y-6 p-4">
    <Card.Root class="shadow-sm">
        <Card.Header>
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-sm font-medium text-muted-foreground">Panel administrativo</p>
                    <Card.Title class="mt-1 text-3xl">Gestión de tarjetas</Card.Title>
                </div>
                <Button type="button" variant="outline" size="icon" class="shrink-0 rounded-full" onclick={() => (helpDialogOpen = true)}>
                    ?
                </Button>
            </div>
        </Card.Header>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Filtros y acciones</Card.Title>
            <Card.Description>Busca por texto, persona, asignador, tipo y estado de uso.</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
            <form
                method="GET"
                class="grid gap-3 lg:grid-cols-4"
                onsubmit={submitFilters}
            >
                <div class="lg:col-span-2">
                    <label class="mb-1 block text-sm font-medium" for="q">Buscar</label>
                    <Input
                        id="q"
                        name="q"
                        value={data.filters?.q ?? ""}
                        placeholder="ID, tipo, razón, persona o asignador"
                    />
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="tipo">Tipo</label>
                    <select id="tipo" name="tipo" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="" selected={(data.filters?.tipo ?? "") === ""}>Todos</option>
                        {#each data.cardTypes as tipo}
                            <option value={tipo} selected={(data.filters?.tipo ?? "") === tipo}>{tipo}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="usado">Estado</label>
                    <select id="usado" name="usado" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="" selected={(data.filters?.usado ?? "") === ""}>Todos</option>
                        <option value="false" selected={(data.filters?.usado ?? "") === "false"}>Vigente</option>
                        <option value="true" selected={(data.filters?.usado ?? "") === "true"}>Usada/Cancelada</option>
                    </select>
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="venceEnDesde">Vence desde (UTC)</label>
                    <Input
                        id="venceEnDesde"
                        name="venceEnDesde"
                        type="datetime-local"
                        value={data.filters?.venceEnDesde ? toDateTimeLocalInput(data.filters.venceEnDesde) : ""}
                    />
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="venceEnHasta">Vence hasta (UTC)</label>
                    <Input
                        id="venceEnHasta"
                        name="venceEnHasta"
                        type="datetime-local"
                        value={data.filters?.venceEnHasta ? toDateTimeLocalInput(data.filters.venceEnHasta) : ""}
                    />
                </div>

                <div>
                    <Input
                        id="persona-search"
                        placeholder="Buscar persona..."
                        bind:value={personaSearch}
                        class="mb-2"
                    />
                    <SelectApp
                        class="h-10"
                        name="userId_ui"
                        label="Persona"
                        type="multiple"
                        options={personaOptions}
                        placeholder="Selecciona personas"
                        bind:value={selectedUserIds}
                    />
                    {#each selectedUserIds as userId (userId)}
                        <input type="hidden" name="userId" value={userId} />
                    {/each}
                </div>

                <div>
                    <Input
                        id="assigned-by-search"
                        placeholder="Buscar asignador..."
                        bind:value={asignadoPorSearch}
                        class="mb-2"
                    />
                    <SelectApp
                        name="assignedById_ui"
                        label="Asignada por"
                        type="multiple"
                        options={asignadoPorOptions}
                        placeholder="Selecciona asignadores"
                        bind:value={selectedAssignedByIds}
                    />
                    {#each selectedAssignedByIds as assignedById (assignedById)}
                        <input type="hidden" name="assignedById" value={assignedById} />
                    {/each}
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="orderBy">Ordenar por</label>
                    <select id="orderBy" name="orderBy" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="createdAt" selected={(data.filters?.orderBy ?? "createdAt") === "createdAt"}>Fecha</option>
                        <option value="venceEn" selected={(data.filters?.orderBy ?? "createdAt") === "venceEn"}>Vencimiento</option>
                        <option value="tipoCarta" selected={(data.filters?.orderBy ?? "createdAt") === "tipoCarta"}>Tipo</option>
                        <option value="usado" selected={(data.filters?.orderBy ?? "createdAt") === "usado"}>Estado</option>
                    </select>
                </div>

                <div>
                    <label class="mb-1 block text-sm font-medium" for="orderDir">Dirección</label>
                    <select id="orderDir" name="orderDir" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="desc" selected={(data.filters?.orderDir ?? "desc") === "desc"}>Descendente</option>
                        <option value="asc" selected={(data.filters?.orderDir ?? "desc") === "asc"}>Ascendente</option>
                    </select>
                </div>

                <div class="lg:col-span-4 flex flex-wrap gap-2">
                    <Button type="submit">Aplicar filtros</Button>
                    <Button href="/app/gestion_tarjetas" variant="outline">Limpiar</Button>

                    {#if data.canCreate}
                        <Button type="button" onclick={() => (isCreateDialogOpen = true)} class="ml-auto">
                            Agregar tarjeta
                        </Button>
                    {/if}
                </div>
            </form>
        </Card.Content>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Tabla de tarjetas</Card.Title>
            <Card.Description>
                Gestiona tarjetas existentes y actualiza su tipo o estado.
            </Card.Description>
        </Card.Header>
        <Card.Content class="p-0">
            <div class="grid gap-3 p-4 lg:hidden">
                {#if data.tarjetas.length === 0}
                    <div class="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                        No se encontraron tarjetas con los filtros actuales.
                    </div>
                {:else}
                    {#each data.tarjetas as tarjeta}
                        <div class="rounded-xl border bg-card p-4 shadow-sm">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="truncate text-xs text-muted-foreground">{tarjeta.id}</p>
                                    <p class="truncate font-semibold">{tarjeta.persona}</p>
                                    <p class="truncate text-xs text-muted-foreground">Asignada por {tarjeta.asignadoPor}</p>
                                </div>
                                <Badge variant={tarjeta.tipo === "roja" ? "destructive" : "outline"} class={getCardTypeBadgeClass(tarjeta.tipo)}>{tarjeta.tipo}</Badge>
                            </div>

                            <div class="mt-4 space-y-3">
                                <div>
                                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Razón</p>
                                    <p class="text-sm leading-relaxed">{tarjeta.razon}</p>
                                </div>

                                <div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                    <p><span class="font-medium">Creada:</span> {formatDate(tarjeta.fechaCreacion)}</p>
                                    <p><span class="font-medium">Vence:</span> {formatDate(tarjeta.venceEn)}</p>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                    {#if tarjeta.usado}
                                        <Badge variant="secondary">Usada/Cancelada</Badge>
                                    {:else if tarjeta.vencida}
                                        <Badge variant="destructive">Vencida</Badge>
                                    {:else}
                                        <Badge>Vigente</Badge>
                                    {/if}

                                    {#if tarjeta.complaint}
                                        <Badge variant={tarjeta.complaint.atendido ? "secondary" : "default"}>
                                            {tarjeta.complaint.atendido ? "Reclamo resuelto" : "Reclamo pendiente"}
                                        </Badge>
                                    {:else}
                                        <Badge variant="outline">Sin reclamo</Badge>
                                    {/if}
                                </div>

                                {#if tarjeta.complaint}
                                    <div class="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                                        <div>
                                            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reclamo</p>
                                            <p>{tarjeta.complaint.razon}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Respuesta</p>
                                            <p>{tarjeta.complaint.atendido ? tarjeta.complaint.respuesta ?? "Sin respuesta." : "Pendiente de revisión."}</p>
                                        </div>
                                    </div>
                                {/if}

                                <div class="flex flex-col gap-2 pt-1">
                                    {#if data.canResolveComplaints && tarjeta.complaint && !tarjeta.complaint.atendido}
                                        <Button size="sm" variant="secondary" onclick={() => openComplaintReviewDialog(tarjeta.complaint)}>
                                            Revisar reclamo
                                        </Button>
                                    {/if}

                                    {#if data.canEdit}
                                        <form method="POST" action="?/update" class="grid gap-2" use:enhance={withUTCDateFields(["venceEn"], "Tarjeta actualizada")}>
                                            <input type="hidden" name="id_tarjeta" value={tarjeta.id} />
                                            <div class="grid grid-cols-2 gap-2">
                                                <select name="tipo" class="h-10 rounded-md border bg-background px-2 text-xs">
                                                    {#each data.cardTypes as tipo}
                                                        <option value={tipo} selected={tarjeta.tipo === tipo}>{tipo}</option>
                                                    {/each}
                                                </select>

                                                <select name="usado" class="h-10 rounded-md border bg-background px-2 text-xs">
                                                    <option value="false" selected={!tarjeta.usado}>vigente</option>
                                                    <option value="true" selected={tarjeta.usado}>usada</option>
                                                </select>
                                            </div>

                                            <Input name="venceEn" type="datetime-local" value={toDateTimeLocalInput(tarjeta.venceEn)} class="h-10" />

                                            <Button type="submit" size="sm" variant="outline">Guardar</Button>
                                        </form>
                                    {/if}

                                    {#if data.canDelete}
                                        <form method="POST" action="?/delete" use:enhance={withFeedback("Tarjeta eliminada")}> 
                                            <input type="hidden" name="id_tarjeta" value={tarjeta.id} />
                                            <Button type="submit" size="sm" variant="destructive" class="w-full">Eliminar</Button>
                                        </form>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="hidden overflow-x-auto lg:block">
                <table class="w-full min-w-240 text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30 text-left">
                            <th class="px-4 py-3 font-semibold">ID</th>
                            <th class="px-4 py-3 font-semibold">Persona</th>
                            <th class="px-4 py-3 font-semibold">Asignada por</th>
                            <th class="px-4 py-3 font-semibold">Tipo</th>
                            <th class="px-4 py-3 font-semibold">Razón</th>
                            <th class="px-4 py-3 font-semibold">Fecha</th>
                            <th class="px-4 py-3 font-semibold">Vence en</th>
                            <th class="px-4 py-3 font-semibold">Estado</th>
                            <th class="px-4 py-3 font-semibold">Reclamo</th>
                            <th class="px-4 py-3 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if data.tarjetas.length === 0}
                            <tr>
                                <td colspan="10" class="px-4 py-10 text-center text-muted-foreground">
                                    No se encontraron tarjetas con los filtros actuales.
                                </td>
                            </tr>
                        {:else}
                            {#each data.tarjetas as tarjeta}
                                <tr class="border-b align-top">
                                    <td class="px-4 py-3 font-mono text-xs">{tarjeta.id}</td>
                                    <td class="px-4 py-3">
                                        <p class="font-medium">{tarjeta.persona}</p>
                                        {#if tarjeta.personaEmail}
                                            <p class="text-xs text-muted-foreground">{tarjeta.personaEmail}</p>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        <p class="font-medium">{tarjeta.asignadoPor}</p>
                                        {#if tarjeta.asignadoPorEmail}
                                            <p class="text-xs text-muted-foreground">{tarjeta.asignadoPorEmail}</p>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        <Badge variant={tarjeta.tipo === "roja" ? "destructive" : "outline"} class={getCardTypeBadgeClass(tarjeta.tipo)}>
                                            {tarjeta.tipo}
                                        </Badge>
                                    </td>
                                    <td class="max-w-80 px-4 py-3 text-xs leading-relaxed text-muted-foreground">{tarjeta.razon}</td>
                                    <td class="px-4 py-3 text-xs">{formatDate(tarjeta.fechaCreacion)}</td>
                                    <td class="px-4 py-3 text-xs">{formatDate(tarjeta.venceEn)}</td>
                                    <td class="px-4 py-3">
                                        {#if tarjeta.usado}
                                            <Badge variant="secondary">Usada/Cancelada</Badge>
                                        {:else if tarjeta.vencida}
                                            <Badge variant="destructive">Vencida</Badge>
                                        {:else}
                                            <Badge variant="default">Vigente</Badge>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if tarjeta.complaint}
                                            <div class="space-y-1">
                                                <Badge variant={tarjeta.complaint.atendido ? "secondary" : "default"}>
                                                    {tarjeta.complaint.atendido ? "Resuelto" : "Pendiente"}
                                                </Badge>
                                                <p class="max-w-56 text-xs text-muted-foreground">{tarjeta.complaint.razon}</p>
                                                {#if tarjeta.complaint.atendido}
                                                    <p class="text-xs text-muted-foreground">{tarjeta.complaint.respuesta ?? "Sin respuesta."}</p>
                                                {/if}
                                            </div>
                                        {:else}
                                            <span class="text-xs text-muted-foreground">Sin reclamo</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex flex-col gap-2">
                                            {#if data.canResolveComplaints && tarjeta.complaint && !tarjeta.complaint.atendido}
                                                <Button size="sm" variant="secondary" onclick={() => openComplaintReviewDialog(tarjeta.complaint)}>
                                                    Revisar reclamo
                                                </Button>
                                            {/if}

                                            {#if data.canEdit}
                                                <form method="POST" action="?/update" class="flex flex-wrap items-center gap-2" use:enhance={withUTCDateFields(["venceEn"], "Tarjeta actualizada")}> 
                                                    <input type="hidden" name="id_tarjeta" value={tarjeta.id} />

                                                    <select name="tipo" class="h-9 rounded-md border bg-background px-2 text-xs">
                                                        {#each data.cardTypes as tipo}
                                                            <option value={tipo} selected={tarjeta.tipo === tipo}>{tipo}</option>
                                                        {/each}
                                                    </select>

                                                    <select name="usado" class="h-9 rounded-md border bg-background px-2 text-xs">
                                                        <option value="false" selected={!tarjeta.usado}>vigente</option>
                                                        <option value="true" selected={tarjeta.usado}>usada</option>
                                                    </select>

                                                    <Input
                                                        name="venceEn"
                                                        type="datetime-local"
                                                        value={toDateTimeLocalInput(tarjeta.venceEn)}
                                                        class="h-9 w-44"
                                                    />

                                                    <Button type="submit" size="sm" variant="outline">Guardar</Button>
                                                </form>
                                            {/if}

                                            {#if data.canDelete}
                                                <form method="POST" action="?/delete" use:enhance={withFeedback("Tarjeta eliminada")}> 
                                                    <input type="hidden" name="id_tarjeta" value={tarjeta.id} />
                                                    <Button type="submit" size="sm" variant="destructive">Eliminar</Button>
                                                </form>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                <p class="text-muted-foreground">
                    Mostrando página {data.pagination?.page ?? 1} de {data.pagination?.totalPages ?? 1}. Total tarjetas: {data.pagination?.totalItems ?? 0}
                </p>
                <div class="flex items-center gap-2">
                    <Button
                        href={buildPageHref(Math.max(1, (data.pagination?.page ?? 1) - 1))}
                        variant="outline"
                        disabled={!data.pagination?.hasPrev}
                        size="sm"
                    >
                        Anterior
                    </Button>
                    <Button
                        href={buildPageHref(Math.min(data.pagination?.totalPages ?? 1, (data.pagination?.page ?? 1) + 1))}
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
</div>

<Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Agregar tarjeta</Dialog.Title>
            <Dialog.Description>
                Completa los parámetros para asignar una nueva tarjeta a un usuario.
            </Dialog.Description>
        </Dialog.Header>

        <form method="POST" action="?/create" id="create-card-form" class="space-y-3" use:enhance={withUTCDateFields(["venceEn"], "Tarjeta creada", true)}>
            <div class="space-y-1">
                <label class="block text-sm font-medium" for="id_personas">Persona</label>
                <Input
                    id="create-persona-search"
                    placeholder="Buscar persona..."
                    bind:value={createPersonaSearch}
                    class="mb-2"
                />
                <select id="id_personas" name="id_personas" required class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Seleccionar persona</option>
                    {#each data.userOptions as user}
                        {#if matchUserSearch(user, createPersonaSearch)}
                            <option value={user.id}>{formatUserLabel(user)}</option>
                        {/if}
                    {/each}
                </select>
            </div>

            <div class="space-y-1">
                <label class="block text-sm font-medium" for="tipo-create">Tipo de tarjeta</label>
                <select id="tipo-create" name="tipo" required class="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Seleccionar tipo</option>
                    {#each data.cardTypes as tipo}
                        <option value={tipo}>{tipo}</option>
                    {/each}
                </select>
            </div>

            <div class="space-y-1">
                <label class="block text-sm font-medium" for="venceEn-create">Vence en (UTC)</label>
                <Input id="venceEn-create" name="venceEn" type="datetime-local" />
                <p class="text-xs text-muted-foreground">Si no indicas fecha, se asignará automáticamente un mes desde hoy.</p>
            </div>

            <div class="space-y-1">
                <label class="block text-sm font-medium" for="razon">Razón</label>
                <textarea
                    id="razon"
                    name="razon"
                    required
                    minlength="3"
                    class="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Describe el motivo de la tarjeta"
                ></textarea>
            </div>
        </form>

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button type="submit" form="create-card-form">Crear tarjeta</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={complaintReviewDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Revisar reclamo</Dialog.Title>
            <Dialog.Description>
                {#if selectedComplaint}
                    Responde al reclamo y decide si se rechaza o si se cancela la tarjeta.
                {:else}
                    Selecciona un reclamo para continuar.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedComplaint}
            <form method="POST" action="?/resolve_complaint" id="resolve-complaint-form" class="space-y-4" use:enhance={withFeedback("Reclamo actualizado")}> 
                <input type="hidden" name="complaintId" value={selectedComplaint.id} />

                <div class="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                    <div>
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reclamo original</p>
                        <p>{selectedComplaint.razon}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado actual</p>
                        <p>{selectedComplaint.atendido ? "Resuelto" : "Pendiente"}</p>
                    </div>
                </div>

                <div class="space-y-1">
                    <label class="block text-sm font-medium" for="complaint-response">Respuesta del administrador</label>
                    <textarea
                        id="complaint-response"
                        name="respuesta"
                        bind:value={complaintResponse}
                        class="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Escribe la respuesta del reclamo"
                    ></textarea>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                    <label class="flex items-center gap-2 rounded-md border p-3 text-sm">
                        <input type="radio" name="decision" value="reject" bind:group={complaintDecision} />
                        <span>Rechazar reclamo</span>
                    </label>
                    <label class="flex items-center gap-2 rounded-md border p-3 text-sm">
                        <input type="radio" name="decision" value="use" bind:group={complaintDecision} />
                        <span>Cancelar tarjeta</span>
                    </label>
                </div>
            </form>
        {/if}

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cerrar</Button>
            </Dialog.Close>
            <Button type="submit" form="resolve-complaint-form" disabled={!selectedComplaint}>
                Guardar respuesta
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={helpDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Qué puedes hacer aquí</Dialog.Title>
            <Dialog.Description>Resumen rápido de la gestión administrativa de tarjetas.</Dialog.Description>
        </Dialog.Header>

        <div class="space-y-3 text-sm text-muted-foreground">
            <p>Desde esta vista puedes crear, editar y eliminar tarjetas, además de revisar los reclamos de los usuarios.</p>
            <p>Cuando una tarjeta tenga un reclamo pendiente, podrás leerlo, responderlo y decidir si se rechaza o si la tarjeta se cancela como usada.</p>
            <p>También puedes revisar si una tarjeta ya fue usada o venció, para mantener el control disciplinario.</p>
        </div>

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cerrar</Button>
            </Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>