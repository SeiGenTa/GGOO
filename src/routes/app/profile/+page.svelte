<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Alert from "$lib/components/ui/alert/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Field, FieldDescription, FieldGroup, FieldLabel } from "$lib/components/ui/field";
	import type { PageProps } from "./$types";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";

	let { data, form }: PageProps = $props();

	let nameDialogOpen = $state(false);
	let emailDialogOpen = $state(false);
	let nameDraft = $state("");
	let emailDraft = $state("");
	let nameConfirmation = $state(false);
	let emailConfirmation = $state(false);

	$effect(() => {
		nameDraft = data.user.nombre;
		emailDraft = data.user.email;
	});
</script>

<section class="mx-auto w-full max-w-3xl space-y-6 px-3 py-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Mi perfil</Card.Title>
			<Card.Description>Actualiza los datos principales de tu cuenta.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if form?.success === false}
				<Alert.Root variant="destructive" class="mb-4">
					<AlertCircleIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{form.message}</Alert.Description>
				</Alert.Root>
			{:else if form?.success === true}
				<Alert.Root class="mb-4">
					<Alert.Title>Actualización completada</Alert.Title>
					<Alert.Description>{form.message ?? "Tus datos fueron actualizados correctamente."}</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-md border bg-muted/30 p-3">
					<p class="text-sm text-muted-foreground">ID de usuario</p>
					<p class="font-mono text-xs">{data.user.id}</p>
				</div>
				<div class="rounded-md border bg-muted/30 p-3">
					<p class="text-sm text-muted-foreground">Correo actual</p>
					<p class="text-sm font-medium">{data.user.email}</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Apodo</Card.Title>
			<Card.Description>Puedes definir o corregir tu apodo visible.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/set_user" class="space-y-4">
				<FieldGroup>
					<Field>
						<FieldLabel for="apodo">Apodo</FieldLabel>
						<Input id="apodo" name="apodo" value={data.user.apodo ?? ""} placeholder="Tu apodo" maxlength={80} />
						<FieldDescription>Déjalo vacío si prefieres no usar apodo.</FieldDescription>
					</Field>
				</FieldGroup>

				<Button type="submit">Guardar apodo</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Nombre</Card.Title>
			<Card.Description>Cambiar el nombre requiere revisión de administrador.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<FieldGroup>
				<Field>
					<FieldLabel for="nombre">Nombre completo</FieldLabel>
					<Input id="nombre" name="nombre" bind:value={nameDraft} required minlength={3} maxlength={120} />
				</Field>
			</FieldGroup>

			<Button
				type="button"
				variant="destructive"
				onclick={() => {
					nameConfirmation = false;
					nameDialogOpen = true;
				}}
			>
				Cambiar nombre
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Correo electrónico</Card.Title>
			<Card.Description>Al cambiar tu correo, deberás validarlo nuevamente.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<FieldGroup>
				<Field>
					<FieldLabel for="email">Nuevo correo</FieldLabel>
					<Input id="email" name="email" type="email" bind:value={emailDraft} required />
				</Field>
			</FieldGroup>

			<Button
				type="button"
				variant="outline"
				onclick={() => {
					emailConfirmation = false;
					emailDialogOpen = true;
				}}
			>
				Cambiar correo
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Contraseña</Card.Title>
			<Card.Description>Actualiza tu contraseña para mantener segura tu cuenta.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/set_password" class="space-y-4">
				<FieldGroup>
					<Field>
						<FieldLabel for="current_password">Contraseña actual</FieldLabel>
						<Input id="current_password" name="current_password" type="password" required />
					</Field>
					<Field>
						<FieldLabel for="new_password">Nueva contraseña</FieldLabel>
						<Input id="new_password" name="new_password" type="password" minlength={8} required />
					</Field>
					<Field>
						<FieldLabel for="confirm_password">Confirmar nueva contraseña</FieldLabel>
						<Input id="confirm_password" name="confirm_password" type="password" minlength={8} required />
					</Field>
				</FieldGroup>

				<Button type="submit">Actualizar contraseña</Button>
			</form>
		</Card.Content>
	</Card.Root>
</section>

<Dialog.Root bind:open={nameDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmar cambio de nombre</Dialog.Title>
			<Dialog.Description>
				{#if form?.willBlock !== false}
					Al cambiar el nombre, el nuevo nombre debe ser validado por administrador bloqueando al usuario hasta esto.
				{:else}
					Tu nombre será actualizado inmediatamente sin necesidad de validación adicional.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/set_name" id="set-name-form" class="space-y-3">
			<div class="rounded-md border bg-muted/30 p-3 text-sm">
				<p class="text-muted-foreground">Nuevo nombre:</p>
				<p class="font-medium">{nameDraft}</p>
			</div>
			<label class="flex items-start gap-2 rounded-md border p-3 text-sm">
				<input type="checkbox" bind:checked={nameConfirmation} class="mt-1" />
				<span>
					{#if form?.willBlock !== false}
						Confirmo que entiendo que mi cuenta quedará bloqueada hasta la validación del administrador.
					{:else}
						Confirmo que deseo cambiar mi nombre ahora.
					{/if}
				</span>
			</label>
			<input type="hidden" name="nombre" value={nameDraft} />
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Cancelar</Button>
			</Dialog.Close>
			<Button type="submit" form="set-name-form" variant="destructive" disabled={!nameConfirmation || nameDraft.trim().length < 3}>
				Confirmar cambio
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={emailDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmar cambio de correo</Dialog.Title>
			<Dialog.Description>
				{#if form?.willBlock !== false}
					Se requerirá validar tu correo nuevamente bloqueando tu acceso hasta que confirmes.
				{:else}
					Tu correo será actualizado inmediatamente. Se enviará un correo de notificación.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/set_email" id="set-email-form" class="space-y-3">
			<div class="rounded-md border bg-muted/30 p-3 text-sm">
				<p class="text-muted-foreground">Nuevo correo:</p>
				<p class="font-medium">{emailDraft}</p>
			</div>
			<label class="flex items-start gap-2 rounded-md border p-3 text-sm">
				<input type="checkbox" bind:checked={emailConfirmation} class="mt-1" />
				<span>
					{#if form?.willBlock !== false}
						Confirmo que entiendo que puede requerirse revalidación del correo para continuar usando la cuenta.
					{:else}
						Confirmo que deseo cambiar mi correo ahora.
					{/if}
				</span>
			</label>
			<input type="hidden" name="email" value={emailDraft} />
		</form>

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Cancelar</Button>
			</Dialog.Close>
			<Button type="submit" form="set-email-form" variant="destructive" disabled={!emailConfirmation || emailDraft.trim().length === 0}>
				Confirmar cambio
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
