<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { enhance } from "$app/forms";
    import InputApp from "$lib/components/app/input.svelte";
    import SelectApp from "$lib/components/app/select.svelte";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Item from "$lib/components/ui/item";
    import Label from "$lib/components/ui/label/label.svelte";
    import Separator from "$lib/components/ui/separator/separator.svelte";
    import Switch from "$lib/components/ui/switch/switch.svelte";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    let { data } = $props();
    const pichanga = $derived(data.pichanga);

    let open_edit = $state(false);
    let loading_edit = $state(false);
    let options_admins: { value: string; label: string }[] = $state([]);
    let selected_admins: string[] = $state([]);
    let switch_init_now = $state(false);
    let refreshing = $state(false);

    const user_id = $derived(data.user?.id ?? "");
    const inscrito = $derived(user_id ? pichanga.inscripciones.some((i) => i.user.id === user_id) : false);
    const admin_partido = $derived(user_id ? pichanga.admins.some((a) => a.id === user_id) : false);
    const inscripciones_abierta = $derived(new Date() >= new Date(pichanga.fechaInicioIncripcion));

    const inscritos = $derived(pichanga.inscripciones.slice(0, pichanga.maxJugadores));
    const lista_espera = $derived(pichanga.inscripciones.slice(pichanga.maxJugadores));

    const toDateTimeLocal = (date: string | Date) => {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return "";
        const pad = (value: number) => value.toString().padStart(2, "0");

        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    onMount(() => {
        const eventSource = new EventSource(`/api/stream?id_pichanga=${encodeURIComponent(pichanga.id)}`);

        const handlePichangaUpdate = async () => {
            if (refreshing) return;
            refreshing = true;

            try {
                await invalidateAll();
            } finally {
                refreshing = false;
            }
        };

        const init = async () => {
            const data_users: {
                user: { id: string; nombre: string }[];
            } = await fetch("/api/user?select=id&select=nombre", {
                headers: {
                    "Content-Type": "application/json",
                },
            }).then((res) => res.json());

            options_admins = data_users.user.map((u) => ({ value: u.id, label: u.nombre }));
        };

        eventSource.addEventListener("pichanga-update", handlePichangaUpdate);
        eventSource.onerror = () => {
            eventSource.close();
        };

        void init();

        return () => {
            eventSource.removeEventListener("pichanga-update", handlePichangaUpdate);
            eventSource.close();
        };
    });

    $effect(() => {
        selected_admins = pichanga.admins.map((admin) => admin.id);
    });
</script>

<div class="min-h-full rounded-2xl sm:p-5">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card.Root class="lg:col-span-2 border-slate-200/70 shadow-lg">
            <Card.Header class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <Card.Title class="text-lg sm:text-xl"
                            >{pichanga.nombre ?? `Pichanga del ${new Date(pichanga.fecha).toLocaleDateString("es-CL")}`}</Card.Title
                        >
                        <p class="text-xs text-muted-foreground sm:text-sm">Panel de datos del partido</p>
                    </div>

                    <Badge variant={inscritos.length >= pichanga.maxJugadores ? "destructive" : "default"}>
                        {inscritos.length}/{pichanga.maxJugadores} cupos
                    </Badge>
                </div>

                <Card.Action class="flex w-full flex-wrap gap-2">
                    {#if data.user?.es_admin}
                        <Dialog.Root bind:open={open_edit}>
                            <Dialog.Trigger>
                                {#snippet child({ props })}
                                    <Button {...props} variant="outline" size="sm">Editar</Button>
                                {/snippet}
                            </Dialog.Trigger>
                            <Dialog.DialogContent>
                                <Dialog.Header>
                                    <Dialog.Title>Editar pichanga</Dialog.Title>
                                </Dialog.Header>

                                <form
                                    id="form-edit"
                                    method="POST"
                                    action="?/editar"
                                    class="space-y-4"
                                    use:enhance={({ formData }) => {
                                        loading_edit = true;

                                        const date_pichanga = formData.get("date-pichanga") as string;
                                        if (date_pichanga) {
                                            formData.set("date-pichanga", new Date(date_pichanga).toISOString());
                                        }

                                        const date_init_register = formData.get("date-init-register") as string;
                                        if (date_init_register && !formData.get("habilitar")) {
                                            formData.set("date-init-register", new Date(date_init_register).toISOString());
                                        }

                                        return async ({ result, update }) => {
                                            loading_edit = false;

                                            if (result.type === "success") {
                                                toast("Pichanga actualizada", {
                                                    description: "Los cambios se guardaron correctamente.",
                                                });
                                                open_edit = false;
                                                await update();
                                            }

                                            if (result.type === "failure") {
                                                toast("No fue posible guardar", {
                                                    description: (result.data as any).error ?? "Revisa los datos del formulario.",
                                                });
                                            }
                                        };
                                    }}
                                >
                                    <InputApp
                                        id="name"
                                        name="name-pichanga"
                                        label="Nombre de la pichanga"
                                        placeholder="Pichanga del sábado"
                                        value={pichanga.nombre ?? ""}
                                    />

                                    <InputApp
                                        id="date"
                                        name="date-pichanga"
                                        label="Fecha y hora de la pichanga"
                                        type="datetime-local"
                                        required
                                        value={toDateTimeLocal(pichanga.fecha)}
                                    />

                                    <SelectApp
                                        name="admins"
                                        label="Admins"
                                        type="multiple"
                                        options={options_admins}
                                        placeholder="Selecciona admins"
                                        bind:value={selected_admins}
                                    />

                                    <InputApp
                                        id="location"
                                        name="location"
                                        label="Ubicación"
                                        placeholder="Cancha central"
                                        value={pichanga.lugar ?? ""}
                                    />

                                    <InputApp
                                        id="max_players"
                                        name="max_players"
                                        label="Número máximo de jugadores"
                                        type="number"
                                        value={pichanga.maxJugadores.toString()}
                                        required
                                    />

                                    <InputApp
                                        id="date-init_register"
                                        name="date-init-register"
                                        label="Fecha de inicio de inscripción"
                                        type="datetime-local"
                                        value={toDateTimeLocal(pichanga.fechaInicioIncripcion)}
                                        disabled={switch_init_now}
                                        required={!switch_init_now}
                                    />

                                    <div class="flex items-center gap-2 rounded-lg border p-3">
                                        <Switch id="habilitar" name="habilitar" bind:checked={switch_init_now} />
                                        <Label for="habilitar">Habilitar inscripciones ahora</Label>
                                    </div>
                                </form>

                                <Dialog.Footer>
                                    <Dialog.Close>Cancelar</Dialog.Close>
                                    <Button type="submit" form="form-edit" disabled={loading_edit}>Guardar cambios</Button>
                                </Dialog.Footer>
                            </Dialog.DialogContent>
                        </Dialog.Root>
                    {/if}

                    {#if !admin_partido && data.user}
                        {#if inscrito}
                            <form method="POST" action="?/salir" use:enhance>
                                <Button type="submit" variant="outline" size="sm">Salir</Button>
                            </form>
                        {:else}
                            <form method="POST" action="?/inscribirse" use:enhance>
                                <Button type="submit" variant="default" size="sm" disabled={!inscripciones_abierta}>Unirse</Button>
                            </form>
                        {/if}
                    {/if}
                </Card.Action>
            </Card.Header>

            <Separator />

            <Card.Content class="space-y-3">
                <Item.Root variant="default" class="rounded-xl border">
                    <Item.Header>
                        <Item.Title>Admins</Item.Title>
                    </Item.Header>
                    <Item.Content class="flex flex-wrap gap-2">
                        {#each pichanga.admins as admin}
                            <Badge variant="outline">{admin.nombre}</Badge>
                        {/each}
                    </Item.Content>
                </Item.Root>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Item.Root variant="default" class="rounded-xl border ">
                        <Item.Header>
                            <Item.Title>Fecha del partido</Item.Title>
                        </Item.Header>
                        <Item.Content>
                            <div class="text-sm font-medium">{new Date(pichanga.fecha).toLocaleString("es-CL")}</div>
                        </Item.Content>
                    </Item.Root>

                    <Item.Root variant="default" class="rounded-xl border ">
                        <Item.Header>
                            <Item.Title>Inicio de inscripción</Item.Title>
                        </Item.Header>
                        <Item.Content>
                            <div class="text-sm font-medium">{new Date(pichanga.fechaInicioIncripcion).toLocaleString("es-CL")}</div>
                        </Item.Content>
                    </Item.Root>
                </div>

                <Item.Root variant="default" class="rounded-xl border ">
                    <Item.Header>
                        <Item.Title>Ubicación</Item.Title>
                    </Item.Header>
                    <Item.Content>
                        <div class="text-sm">{pichanga.lugar ?? "Por definir"}</div>
                    </Item.Content>
                </Item.Root>
            </Card.Content>
        </Card.Root>

        <Card.Root class="lg:col-span-3 border-slate-200/70 shadow-lg">
            <Card.Header class="space-y-1">
                <Card.Title class="text-lg sm:text-xl">Inscripciones en vivo</Card.Title>
                <p class="text-xs text-muted-foreground sm:text-sm">El orden se mantiene por hora de registro.</p>
            </Card.Header>

            <Card.Content class="space-y-5">
                <section>
                    <div class="mb-2 flex items-center justify-between">
                        <h2 class="text-base font-semibold">Titulares</h2>
                        <Badge variant="secondary">{inscritos.length}</Badge>
                    </div>

                    {#if inscritos.length > 0}
                        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {#each inscritos as inscripcion, index}
                                <li class="rounded-lg border bg-background/80 px-3 py-2 text-sm font-medium">
                                    <span class="text-muted-foreground">{index + 1}.</span>
                                    {inscripcion.user.nombre}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hay jugadores inscritos.</p>
                    {/if}
                </section>

                <section>
                    <div class="mb-2 flex items-center justify-between">
                        <h2 class="text-base font-semibold">Lista de espera</h2>
                        <Badge variant="outline">{lista_espera.length}</Badge>
                    </div>

                    {#if lista_espera.length > 0}
                        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {#each lista_espera as inscripcion, index}
                                <li
                                    class="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium dark:border-amber-900/50 dark:bg-amber-950/20"
                                >
                                    <span class="text-muted-foreground">{index + pichanga.maxJugadores + 1}.</span>
                                    {inscripcion.user.nombre}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Sin lista de espera por ahora.</p>
                    {/if}
                </section>
            </Card.Content>
        </Card.Root>
    </div>
</div>
