<script lang="ts">
    import Button from '$lib/components/ui/button/button.svelte'
    import * as Dialog from '$lib/components/ui/dialog'
    import InputApp from '$lib/components/app/input.svelte'
    import SelectApp from '$lib/components/app/select.svelte'
    import { enhance } from '$app/forms'
    import Label from '$lib/components/ui/label/label.svelte'
    import Switch from '$lib/components/ui/switch/switch.svelte'
    import { onMount } from 'svelte'
    import { toast } from 'svelte-sonner'
    import SuggestRegisterDate from './suggest_register_date.svelte'
    import {
        localDateTimeInputToUTCISO,
        utcISOToLocalDateTimeInput,
    } from '$lib/datetime'

    let open = $state(false)
    let loading = $state(false)

    const { gestores } = $props()

    let options_admins: { value: string; label: string }[] = $derived(gestores)
    let switch_init_now = $state(false)
    let date_pichanga = $state('')
    let date_init_register = $state('')
    let name_pichanga = $state('')
    let nameTouched = $state(false)

    $effect(() => {
        const fecha = date_pichanga
        if (nameTouched || !fecha) return
        const d = new Date(fecha)
        if (Number.isNaN(d.getTime())) return
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        name_pichanga = `Pichanga ${dd}/${mm}`
    })

    const setFechaSugerida = () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(14, 30, 0, 0)
        date_pichanga = utcISOToLocalDateTimeInput(d)
    }
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
            use:enhance={({ formData, cancel }) => {
                loading = true
                try {
                    const date_pichanga = formData.get(
                        'date-pichanga'
                    ) as string
                    formData.set(
                        'date-pichanga',
                        localDateTimeInputToUTCISO(date_pichanga)
                    )

                    const date_init_register = formData.get(
                        'date-init-register'
                    ) as string
                    if (date_init_register) {
                        formData.set(
                            'date-init-register',
                            localDateTimeInputToUTCISO(date_init_register)
                        )
                    }
                } catch (err) {
                    loading = false
                    toast('Fecha inválida', {
                        description:
                            err instanceof Error
                                ? err.message
                                : 'Revisa las fechas ingresadas.',
                    })
                    cancel()
                    return
                }

                return ({ result, update }) => {
                    loading = false
                    if (result.type === 'success') {
                        const message =
                            (result.data as any).message ||
                            'Pichanga creada exitosamente'
                        toast('Pichanga creada', {
                            description: message,
                        })
                        open = false
                        update()
                    }
                    if (result.type === 'failure') {
                        alert((result.data as any).error)
                    }
                }
            }}
        >
            <InputApp
                id="name"
                name="name-pichanga"
                label="Nombre de la pichanga (Opcional)"
                placeholder="Pichanga del sábado"
                bind:value={name_pichanga}
                oninput={() => (nameTouched = true)}
            />

            <div>
                <InputApp
                    id="date"
                    name="date-pichanga"
                    label="Fecha y hora de la pichanga"
                    type="datetime-local"
                    required
                    bind:value={date_pichanga}
                />
                <button
                    type="button"
                    onclick={setFechaSugerida}
                    class="text-xs text-primary underline-offset-4 hover:underline"
                >
                    Usar fecha sugerida
                </button>
            </div>

            <SelectApp
                name="admins"
                label="Admins"
                type="multiple"
                options={options_admins}
                placeholder="Selecciona los admins"
            />

            <InputApp
                id="location"
                name="location"
                label="Ubicación de la pichanga (Opcional)"
                placeholder="Cancha central del parque"
            />

            <InputApp
                id="max_players"
                name="max_players"
                label="Número máximo de jugadores (Opcional)"
                type="number"
                placeholder="19"
                value="19"
            />

            <div>
                <InputApp
                    id="date-init_register"
                    name="date-init-register"
                    label="Fecha de inicio de registro"
                    type="datetime-local"
                    disabled={switch_init_now}
                    bind:value={date_init_register}
                />
                <SuggestRegisterDate
                    bind:value={date_init_register}
                    disabled={switch_init_now}
                />
            </div>
            <div class="flex flex-row gap-2">
                <Switch
                    id="habilitar"
                    name="habilitar"
                    bind:checked={switch_init_now}
                />
                <Label id="habilitar">Habilitar inmediatamente</Label>
            </div>
        </form>
        <Dialog.Footer>
            <Dialog.Close>Cancelar</Dialog.Close>
            <Button type="submit" form="form-add" disabled={loading}
                >Crear</Button
            >
        </Dialog.Footer>
    </Dialog.DialogContent>
</Dialog.Root>
