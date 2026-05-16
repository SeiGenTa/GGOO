<script lang="ts">
    import type { SubmitFunction } from "@sveltejs/kit";
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import type { PageProps } from "./$types";

    type Complaint = {
        id: string;
        razon: string;
        fechaReclamo: string;
        atendido: boolean;
        respuesta: string | null;
        administradorAtendio: {
            id: string;
            nombre: string;
            apodo: string | null;
        } | null;
    };

    type TarjetaRow = {
        id: string;
        tipo: string;
        razon: string;
        usado: boolean;
        vencida: boolean;
        venceEn: string;
        createdAt: string;
        assignedBy: {
            id: string;
            nombre: string;
            apodo: string | null;
        } | null;
        complaint: Complaint | null;
        canComplain: boolean;
    };

    type PageData = PageProps["data"] & {
        tarjetas: TarjetaRow[];
        pagination: {
            page: number;
            pageSize: number;
            totalItems: number;
            totalPages: number;
            hasPrev: boolean;
            hasNext: boolean;
        };
    };

    let { data }: { data: PageData } = $props();

    let complaintDialogOpen = $state(false);
    let helpDialogOpen = $state(false);
    let selectedCard = $state<TarjetaRow | null>(null);
    let complaintReason = $state("");

    const getUserLabel = (user: { nombre: string; apodo: string | null }) => {
        if (user.apodo && user.apodo.trim().length > 0) {
            return `${user.apodo} (${user.nombre})`;
        }

        return user.nombre;
    };

    const getCardTypeBadgeClass = (tipo: string) => {
        if (tipo === "amarilla") {
            return "border-yellow-300 bg-yellow-300 text-yellow-950 hover:bg-yellow-300/90";
        }

        return "";
    };

    const formatDate = (value: string | Date) => {
        return new Date(value).toLocaleString("es-CL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const openComplaintDialog = (card: TarjetaRow) => {
        selectedCard = card;
        complaintReason = "";
        complaintDialogOpen = true;
    };

    const withFeedback: SubmitFunction = () => {
        return async ({ result, update }) => {
            if (result.type === "success") {
                const message = (result.data as { message?: string } | null)?.message ?? "Operación completada correctamente.";
                toast("Reclamo enviado", { description: message });
                complaintDialogOpen = false;
                selectedCard = null;
                complaintReason = "";
                await update();
                return;
            }

            if (result.type === "failure") {
                const message = (result.data as { message?: string } | null)?.message ?? "No fue posible enviar el reclamo.";
                toast("Error", { description: message });
                await update();
                return;
            }

            await update();
        };
    };

    const buildPageHref = (targetPage: number) => {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        return `/app/tarjetas?${params.toString()}`;
    };
</script>

<section class="space-y-6 p-4">
    <Card.Root class="shadow-sm">
        <Card.Header>
            <div class="flex items-start justify-between gap-3">
                <div>
                    <Card.Title>Mis tarjetas</Card.Title>
                    <Card.Description>Revisa tus tarjetas, sus vencimientos y el estado de cualquier reclamo.</Card.Description>
                </div>
                <Button type="button" variant="outline" size="icon" class="shrink-0 rounded-full" onclick={() => (helpDialogOpen = true)}>
                    ?
                </Button>
            </div>
        </Card.Header>
    </Card.Root>

    <Card.Root>
        <Card.Content class="p-0">
            <div class="grid gap-3 p-4 lg:hidden">
                {#if data.tarjetas.length === 0}
                    <div class="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                        No tienes tarjetas registradas.
                    </div>
                {:else}
                    {#each data.tarjetas as tarjeta}
                        <div class="rounded-xl border bg-card p-4 shadow-sm">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="font-semibold">{tarjeta.razon}</p>
                                    <p class="text-xs text-muted-foreground">{tarjeta.id}</p>
                                </div>
                                <Badge variant={tarjeta.tipo === "roja" ? "destructive" : "outline"} class={getCardTypeBadgeClass(tarjeta.tipo)}>{tarjeta.tipo}</Badge>
                            </div>

                            <div class="mt-3 space-y-2 text-sm">
                                <div>
                                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asignada por</p>
                                    <p>{tarjeta.assignedBy ? getUserLabel(tarjeta.assignedBy) : "Usuario no encontrado"}</p>
                                </div>

                                <div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                    <p><span class="font-medium">Creada:</span> {formatDate(tarjeta.createdAt)}</p>
                                    <p><span class="font-medium">Vence:</span> {formatDate(tarjeta.venceEn)}</p>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                    {#if tarjeta.usado}
                                        <Badge variant="secondary">Usada</Badge>
                                    {/if}
                                    {#if tarjeta.vencida}
                                        <Badge variant="destructive">Vencida</Badge>
                                    {:else if !tarjeta.usado}
                                        <Badge>Vigente</Badge>
                                    {/if}
                                </div>

                                {#if tarjeta.complaint}
                                    <div class="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                                        <div>
                                            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tu reclamo</p>
                                            <p>{tarjeta.complaint.razon}</p>
                                        </div>
                                        <div>
                                            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Respuesta</p>
                                            {#if tarjeta.complaint.atendido}
                                                <p>{tarjeta.complaint.respuesta ?? "Sin respuesta registrada."}</p>
                                            {:else}
                                                <p class="text-muted-foreground">Pendiente de revisión.</p>
                                            {/if}
                                        </div>
                                    </div>
                                    <p class="text-xs text-muted-foreground">Solo puedes reclamar esta tarjeta una vez.</p>
                                {:else if tarjeta.canComplain}
                                    <Button size="sm" variant="outline" onclick={() => openComplaintDialog(tarjeta)}>Reclamar tarjeta</Button>
                                {:else}
                                    <span class="text-xs text-muted-foreground">Ya existe un reclamo para esta tarjeta.</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="hidden overflow-x-auto lg:block">
                <table class="w-full min-w-260 text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30 text-left">
                            <th class="px-4 py-3 font-semibold">Tipo</th>
                            <th class="px-4 py-3 font-semibold">Razón</th>
                            <th class="px-4 py-3 font-semibold">Asignada por</th>
                            <th class="px-4 py-3 font-semibold">Creada</th>
                            <th class="px-4 py-3 font-semibold">Vence en</th>
                            <th class="px-4 py-3 font-semibold">Estado</th>
                            <th class="px-4 py-3 font-semibold">Reclamo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if data.tarjetas.length === 0}
                            <tr>
                                <td colspan="7" class="px-4 py-10 text-center text-muted-foreground">
                                    No tienes tarjetas registradas.
                                </td>
                            </tr>
                        {:else}
                            {#each data.tarjetas as tarjeta}
                                <tr class="border-b align-top">
                                    <td class="px-4 py-3">
                                        <Badge variant={tarjeta.tipo === "roja" ? "destructive" : "outline"} class={getCardTypeBadgeClass(tarjeta.tipo)}>
                                            {tarjeta.tipo}
                                        </Badge>
                                    </td>
                                    <td class="px-4 py-3 max-w-96">
                                        <p class="leading-relaxed">{tarjeta.razon}</p>
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if tarjeta.assignedBy}
                                            <p class="font-medium">{getUserLabel(tarjeta.assignedBy)}</p>
                                        {:else}
                                            <span class="text-muted-foreground">Usuario no encontrado</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3 text-xs text-muted-foreground">{formatDate(tarjeta.createdAt)}</td>
                                    <td class="px-4 py-3 text-xs text-muted-foreground">{formatDate(tarjeta.venceEn)}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex flex-wrap gap-2">
                                            {#if tarjeta.usado}
                                                <Badge variant="secondary">Usada</Badge>
                                            {/if}
                                            {#if tarjeta.vencida}
                                                <Badge variant="destructive">Vencida</Badge>
                                            {:else if !tarjeta.usado}
                                                <Badge>Vigente</Badge>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 space-y-2">
                                        {#if tarjeta.complaint}
                                            <div class="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                                                <div>
                                                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tu reclamo</p>
                                                    <p>{tarjeta.complaint.razon}</p>
                                                </div>
                                                <div>
                                                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Respuesta del administrador</p>
                                                    {#if tarjeta.complaint.atendido}
                                                        <p>{tarjeta.complaint.respuesta ?? "Sin respuesta registrada."}</p>
                                                        {#if tarjeta.complaint.administradorAtendio}
                                                            <p class="mt-1 text-xs text-muted-foreground">
                                                                Atendido por {getUserLabel(tarjeta.complaint.administradorAtendio)} el {formatDate(tarjeta.complaint.fechaReclamo)}
                                                            </p>
                                                        {/if}
                                                    {:else}
                                                        <p class="text-muted-foreground">Pendiente de revisión.</p>
                                                    {/if}
                                                </div>
                                            </div>
                                            <p class="text-xs text-muted-foreground">Solo puedes reclamar esta tarjeta una vez.</p>
                                        {:else if tarjeta.canComplain}
                                            <Button size="sm" variant="outline" onclick={() => openComplaintDialog(tarjeta)}>Reclamar tarjeta</Button>
                                        {:else}
                                            <span class="text-xs text-muted-foreground">Ya existe un reclamo para esta tarjeta.</span>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                <p class="text-muted-foreground">
                    Mostrando página {data.pagination.page} de {data.pagination.totalPages}. Total tarjetas: {data.pagination.totalItems}
                </p>
                <div class="flex items-center gap-2">
                    <Button
                        href={buildPageHref(Math.max(1, data.pagination.page - 1))}
                        variant="outline"
                        disabled={!data.pagination.hasPrev}
                        size="sm"
                    >
                        Anterior
                    </Button>
                    <Button
                        href={buildPageHref(Math.min(data.pagination.totalPages, data.pagination.page + 1))}
                        variant="outline"
                        disabled={!data.pagination.hasNext}
                        size="sm"
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
</section>

<Dialog.Root bind:open={complaintDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Reclamar tarjeta</Dialog.Title>
            <Dialog.Description>
                {#if selectedCard}
                    Explica por qué consideras que la tarjeta {selectedCard.tipo} debería revisarse.
                {:else}
                    Selecciona una tarjeta para continuar.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedCard}
            <form method="POST" action="?/complain" id="complaint-form" class="space-y-3" use:enhance={withFeedback}>
                <input type="hidden" name="tarjetaId" value={selectedCard.id} />

                <div class="space-y-1">
                    <label class="block text-sm font-medium" for="complaint-reason">Razón del reclamo</label>
                    <textarea
                        id="complaint-reason"
                        name="razon"
                        bind:value={complaintReason}
                        minlength="3"
                        required
                        class="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Describe el motivo de tu reclamo"
                    ></textarea>
                </div>
            </form>
        {/if}

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button type="submit" form="complaint-form" disabled={!selectedCard}>Enviar reclamo</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={helpDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Qué puedes ver aquí</Dialog.Title>
            <Dialog.Description>Información rápida sobre el uso de tus tarjetas.</Dialog.Description>
        </Dialog.Header>

        <div class="space-y-3 text-sm text-muted-foreground">
            <p>Aquí se muestran todas las tarjetas asignadas a tu usuario, junto con la razón por la que fueron aplicadas.</p>
            <p>También puedes ver si una tarjeta ya fue usada o si está vencida, para entender su estado actual.</p>
            <p>Si una tarjeta todavía no tiene reclamo, podrás reclamarla una sola vez desde esta misma pantalla.</p>
            <p>Cuando el administrador responda, la respuesta aparecerá en la tarjeta correspondiente.</p>
        </div>

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cerrar</Button>
            </Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
