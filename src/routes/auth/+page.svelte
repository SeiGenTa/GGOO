<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { FieldGroup, Field, FieldLabel, FieldDescription } from "$lib/components/ui/field";
    import { toggleMode } from "mode-watcher";
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import type { PageProps } from "./$types";
    import { Spinner } from "$lib/components/ui/spinner";

    const id = $props.id();
    let loading = $state(false);
    let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-2">
    <Card.Root class="mx-auto w-full max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Iniciar sesión</Card.Title>
            <Card.Description>Introduce tu correo y contraseña para iniciar sesión en tu cuenta</Card.Description>
        </Card.Header>
        <Card.Content>
            <form
                action="?/login"
                method="POST"
                class="grid w-full gap-6"
                use:enhance={() => {
                    loading = true;
                    return async ({ result, update }) => {
                        if (result.type !== "success") {
                            loading = false;
                            return await update();
                        }
                        toast("Bienvenido ", {
                            description: "No se xd",
                        });
                        loading = false;
                        return goto("/");
                    };
                }}
            >
                {#if form?.success == false}
                    <Alert.Root variant="destructive" class="mb-4">
                        <Alert.Title>Error</Alert.Title>
                        <Alert.Description>{form.message}</Alert.Description>
                    </Alert.Root>
                {/if}
                <FieldGroup>
                    <Field>
                        <FieldLabel for="email-{id}">Correo electrónico</FieldLabel>
                        <Input id="email-{id}" type="email" name="email" placeholder="m@example.com" required />
                    </Field>
                    <Field>
                        <div class="flex items-center">
                            <FieldLabel for="password-{id}">Contraseña</FieldLabel>
                            <a href="/auth/recover" class="ms-auto inline-block text-sm underline"> ¿Olvidaste la contraseña? </a>
                        </div>
                        <Input id="password-{id}" type="password" name="password" required />
                    </Field>
                    <Field>
                        <Button type="submit" class="w-full" disabled={loading}>
                            {#if loading}
                                <Spinner />
                            {/if}
                            Iniciar sesión
                        </Button>
                        <FieldDescription class="text-center">
                            ¿No tienes una cuenta? <a href="/auth/register">Regístrate</a>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
    <Button variant="ghost" onclick={toggleMode} class="fixed left-2 top-2">Cambiar tema</Button>
</div>
