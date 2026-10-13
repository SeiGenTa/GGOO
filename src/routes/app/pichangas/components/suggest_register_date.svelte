<script lang="ts">
    import Button from '$lib/components/ui/button/button.svelte'
    import * as Dialog from '$lib/components/ui/dialog'
    import InputApp from '$lib/components/app/input.svelte'
    import { toast } from 'svelte-sonner'
    import { utcISOToLocalDateTimeInput } from '$lib/datetime'

    let { value = $bindable(''), disabled = false } = $props()

    let open = $state(false)
    let fechaInicial = $state('')
    let fechaFinal = $state('')

    const capDelDia = (base: Date) => {
        const cap = new Date(base)
        cap.setHours(23, 50, 0, 0)
        return cap
    }

    const abrir = () => {
        const ahora = new Date()
        const fin = new Date(ahora.getTime() + 2 * 60 * 60 * 1000)
        const cap = capDelDia(ahora)
        if (fin > cap) fin.setTime(cap.getTime())
        fechaInicial = utcISOToLocalDateTimeInput(ahora)
        fechaFinal = utcISOToLocalDateTimeInput(fin)
    }

    const generar = () => {
        const inicial = new Date(fechaInicial)
        const final = new Date(fechaFinal)
        if (Number.isNaN(inicial.getTime()) || Number.isNaN(final.getTime())) {
            toast('Fecha inválida', {
                description: 'Revisa las fechas ingresadas.',
            })
            return
        }

        const cap = capDelDia(inicial)
        const tope = final < cap ? final : cap
        if (tope < inicial) {
            toast('Rango inválido', {
                description: 'La fecha final debe ser posterior a la inicial.',
            })
            return
        }

        const marcas = new Set<number>()
        for (const step of [10, 15]) {
            const ms = step * 60 * 1000
            for (
                let t = Math.ceil(inicial.getTime() / ms) * ms;
                t <= tope.getTime();
                t += ms
            ) {
                marcas.add(t)
            }
        }
        const opciones = [...marcas].sort((a, b) => a - b)
        if (opciones.length === 0) {
            toast('Sin opciones', {
                description: 'No hay horarios válidos en ese rango.',
            })
            return
        }

        const elegido = opciones[Math.floor(Math.random() * opciones.length)]
        value = utcISOToLocalDateTimeInput(new Date(elegido))
        open = false
    }
</script>

<Dialog.Root bind:open onOpenChange={(o) => o && abrir()}>
    <Dialog.Trigger {disabled}>
        {#snippet child({ props })}
            <button
                {...props}
                type="button"
                {disabled}
                class="text-xs text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
                Usar fecha sugerida
            </button>
        {/snippet}
    </Dialog.Trigger>

    <Dialog.DialogContent>
        <Dialog.Header>
            <Dialog.Title>Sugerir fecha de inicio de registro</Dialog.Title>
        </Dialog.Header>

        <div class="space-y-4">
            <InputApp
                id="fecha-inicial"
                label="Fecha inicial"
                type="datetime-local"
                bind:value={fechaInicial}
            />
            <InputApp
                id="fecha-final"
                label="Fecha final"
                type="datetime-local"
                bind:value={fechaFinal}
            />
        </div>

        <Dialog.Footer>
            <Dialog.Close>Cancelar</Dialog.Close>
            <Button type="button" onclick={generar}>Generar</Button>
        </Dialog.Footer>
    </Dialog.DialogContent>
</Dialog.Root>
