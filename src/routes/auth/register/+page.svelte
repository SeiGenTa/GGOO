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
    import { goto } from "$app/navigation";
    import { Spinner } from "$lib/components/ui/spinner";

    let loading = $state(false);

    let { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center p-2">
    <Card.Root class="mx-auto w-full max-w-lg">
        <Card.Header>
            <Card.Title class="text-2xl">Registro</Card.Title>
            <Card.Description>Crea una cuenta nueva para comenzar</Card.Description>
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
                        if (result.type !== "success") {
                            loading = false;
                            return await update();
                        }
                        toast("Registro completado! ", {
                            description: "Revisa tu correo para validar correo y espera que un administrador te acepte",
                        });
                        loading = false;
                        return goto("/auth");
                    };
                }}
            >
                <FieldGroup>
                    <Field>
                        <FieldLabel for="email">Correo electrónico</FieldLabel>
                        <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                    </Field>
                    <Field>
                        <FieldLabel for="name">Nombre</FieldLabel>
                        <Input id="name" type="text" name="name" placeholder="John Doe" required />
                    </Field>
                    <Field>
                        <FieldLabel>Apodo (opcional)</FieldLabel>
                        <Input type="text" name="nickname" placeholder="johnny" />
                    </Field>
                    <Field>
                        <FieldLabel for="password">Contraseña</FieldLabel>
                        <Input id="password" type="password" name="password" required />
                    </Field>
                    <Field>
                        <FieldLabel for="confirm-password">Confirmar contraseña</FieldLabel>
                        <Input id="confirm-password" type="password" name="confirm-password" required />
                    </Field>
                    <Field>
                        <Button type="submit" class="w-full" disabled={loading}>
                            {#if loading}
                                <Spinner />
                            {/if}
                            Registrarse
                        </Button>
                        <FieldDescription class="text-center">
                            ¿Ya tienes una cuenta? <a href="/auth">Iniciar sesión</a>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
    <Button variant="ghost" onclick={toggleMode} class="fixed left-2 top-2">Cambiar tema</Button>
</div>
