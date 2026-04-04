<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import InputApp from "$lib/components/app/input.svelte";
    import SelectApp from "$lib/components/app/select.svelte";
    import { enhance } from "$app/forms";
    import Label from "$lib/components/ui/label/label.svelte";
    import Switch from "$lib/components/ui/switch/switch.svelte";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    let open = $state(false);
    let loading = $state(false);

    let options_admins: { value: string; label: string }[] = $state([]);
    let switch_init_now = $state(false);

    onMount(async () => {
        const data: {
            user: { id: string; nombre: string }[];
        } = await fetch("/api/user?select=id&select=nombre", {
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());
        options_admins = data.user.map((u) => ({ value: u.id, label: u.nombre }));
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Trigger>
        {#snippet child({ props })}
            <Button {...props} variant="outline">Nueva pichanga</Button>
        {/snippet}
    </Dialog.Trigger>

    <Dialog.DialogContent>
        <Dialog.Header>
            <Dialog.Title>Crear nueva pichanga</Dialog.Title>
        </Dialog.Header>
        <form
            method="POST"
            id="form-add"
            action="?/add_pichanga"
            class="space-y-4"
            use:enhance={({ formData }) => {
                loading = true;
                const date_pichanga = formData.get("date") as string;
                const date_init_register = formData.get("date-init-register") as string;
                formData.set("date", new Date(date_pichanga).toISOString());
                if (date_init_register) {
                    formData.set("date-init-register", new Date(date_init_register).toISOString());
                }

                return ({ result, update }) => {
                    loading = false;
                    if (result.type === "success") {
                        const message = (result.data as any).message || "Pichanga creada exitosamente";
                        toast("Pichanga creada", {
                            description: message,
                        });
                        open = false;
                        update();
                    }
                    if (result.type === "failure") {
                        alert((result.data as any).error);
                    }
                };
            }}
        >
            <InputApp id="name" name="name-pichanga" label="Nombre de la pichanga (Opcional)" placeholder="Pichanga del sábado" />

            <InputApp id="date" name="date-pichanga" label="Fecha y hora de la pichanga" type="datetime-local" required />

            <SelectApp name="admins" label="Admins" type="multiple" options={options_admins} placeholder="Selecciona el tipo de pichanga" />

            <InputApp id="location" name="location" label="Ubicación de la pichanga (Opcional)" placeholder="Cancha central del parque" />

            <InputApp id="max_players" name="max_players" label="Número máximo de jugadores (Opcional)" type="number" placeholder="18" value="18" />

            <InputApp
                id="date-init_register"
                name="date-init-register"
                label="Fecha de inicio de registro"
                type="datetime-local"
                disabled={switch_init_now}
            />
            <div class="flex flex-row gap-2">
                <Switch id="habilitar" name="habilitar" bind:checked={switch_init_now} />
                <Label id="habilitar">Habilitar inmediatamente</Label>
            </div>
        </form>
        <Dialog.Footer>
            <Dialog.Close>Cancelar</Dialog.Close>
            <Button type="submit" form="form-add" disabled={loading}>Crear</Button>
        </Dialog.Footer>
    </Dialog.DialogContent>
</Dialog.Root>
