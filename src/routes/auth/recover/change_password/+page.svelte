<script lang="ts">
    import Input from "$lib/components/app/input.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card";
    import Separator from "$lib/components/ui/separator/separator.svelte";
    import type { PageData, ActionData } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="flex items-center justify-center min-h-screen p-2">
    <Card.Root class="w-full max-w-sm">
        <Card.Header>
            <Card.Title>Restablecer clave</Card.Title>
            <Card.Description>
                Ingresa tu nueva clave para la cuenta {data.email}.
            </Card.Description>
        </Card.Header>

        <form method="POST" class="w-full" action="">
            <Card.Content>
                {#if form?.success === false}
                    <p class="mb-3 text-sm text-red-500">{form.message}</p>
                {/if}

                <div class="pb-4">
                    <input type="hidden" name="token" value={data.token} />
                    <Input
                        name="password"
                        type="password"
                        placeholder="Nueva clave"
                        label="Nueva clave"
                        required
                    />
                    <div class="h-2"></div>
                    <Input
                        name="passwordConfirm"
                        type="password"
                        placeholder="Confirmar nueva clave"
                        label="Confirmar nueva clave"
                        required
                    />
                </div>
            </Card.Content>
            <Separator />
            <Card.Footer class="pt-4">
                <Button type="submit" class="w-full">Actualizar clave</Button>
            </Card.Footer>
        </form>
    </Card.Root>
</div>
