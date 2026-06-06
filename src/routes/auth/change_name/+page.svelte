<script lang="ts">
    import Input from '$lib/components/app/input.svelte'
    import Button from '$lib/components/ui/button/button.svelte'
    import * as Card from '$lib/components/ui/card'
    import Separator from '$lib/components/ui/separator/separator.svelte'

    const { data } = $props()
</script>

<div class="flex justify-center items-center h-screen">
    <Card.Root class="w-full max-w-sm">
        <Card.Header>
            <Card.Title>Restablecer nombre</Card.Title>
            <Card.Description>
                Su nombre a sido rechazado por lo que debe ingresar un nuevo
                nombre para su cuenta. Por favor, coloque su nombre real (nombre
                apellido) mas adelante podra usar la funcion apodo
            </Card.Description>
        </Card.Header>
        <form method="POST" class="w-full" action="">
            <Card.Content>
                <div class="pb-4">
                    <input type="hidden" name="userId" value={data.userId} />
                    <Input
                        name="new_name"
                        placeholder="Juan Alberto"
                        label="Nombre"
                        required
                    />
                </div>
            </Card.Content>
            <Separator />
            <Card.Footer class="pt-4">
                <Button type="submit" class="w-full">Enviar</Button>
            </Card.Footer>
        </form>
    </Card.Root>
</div>
