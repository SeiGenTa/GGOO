<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { FieldGroup, Field, FieldLabel, FieldDescription } from "$lib/components/ui/field";
    import { toggleMode } from "mode-watcher";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import type { PageProps } from "../$types";
    import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";

    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { Spinner } from "$lib/components/ui/spinner";

    let loading = $state(false);
    let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-2">
    <Card.Root class="mx-auto w-full max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Recuperar contraseña</Card.Title>
            <Card.Description>Introduce tu correo para recibir instrucciones</Card.Description>
        </Card.Header>
        <Card.Content>
            {#if form?.success == false}
                <Alert.Root variant="destructive" class="mb-4">
                    <AlertCircleIcon />
                    <Alert.Title>Error</Alert.Title>
                    <Alert.Description>{form.message}</Alert.Description>
                </Alert.Root>
            {/if}

            <form
                method="POST"
                class="grid w-full gap-6"
                use:enhance={() => {
                    loading = true;
                    return async ({ result, update }) => {
                        loading = false;
                        if (result.type !== "success") {
                            return await update();
                        }
                        toast("Correo enviado", {
                            description:
                                "Si existe el correo, recibirás instrucciones para recuperar tu contraseña.",
                        });
                        await update();
                    };
                }}
            >
                <FieldGroup>
                    <Field>
                        <FieldLabel for="email">Correo electrónico</FieldLabel>
                        <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                    </Field>
                    <Field>
                        <Button type="submit" class="w-full" disabled={loading}>
                            {#if loading}
                                <Spinner />
                            {/if}
                            Enviar correo
                        </Button>
                        <FieldDescription class="text-center">
                            <a href="/auth">Volver a iniciar sesión</a>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
    <Button variant="ghost" onclick={toggleMode} class="fixed left-2 top-2">Cambiar tema</Button>
</div>
