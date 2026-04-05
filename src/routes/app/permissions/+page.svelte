<script lang="ts">
	import type { SubmitFunction } from "@sveltejs/kit";
	import { enhance } from "$app/forms";
	import { toast } from "svelte-sonner";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	const labels: Record<string, string> = {
		ver_partidos: "Ver partidos",
		crear_partidos: "Crear partidos",
		editar_partidos: "Editar partidos",
		inscribirse_pichanga: "Inscribirse en pichanga",
		crear_roles: "Crear roles",
		editar_roles: "Editar roles",
		eliminar_roles: "Eliminar roles",
		ver_roles_usuarios: "Ver roles de usuarios",
		asignar_roles: "Asignar roles",
	};

	const getPermissionLabel = (permission: string) => labels[permission] ?? permission;

	const withFeedback = (successTitle: string): SubmitFunction => {
		return () => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					const message = (result.data as { message?: string } | null)?.message ?? "Operación realizada correctamente.";
					toast(successTitle, { description: message });
					await update();
					return;
				}

				if (result.type === "failure") {
					const message = (result.data as { message?: string } | null)?.message ?? "No fue posible completar la acción.";
					toast("Error", { description: message });
					await update();
					return;
				}

				await update();
			};
		};
	};
</script>

<section class="space-y-6">
	{#if data.blocked}
		<Card.Root>
			<Card.Header>
				<Card.Title>Sin permisos para administrar roles</Card.Title>
				<Card.Description>
					Necesitas permisos de administración de roles para acceder a esta sección.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Crear nuevo rol</Card.Title>
				<Card.Description>Define un nombre y selecciona los permisos que tendrá este rol.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/create_role" class="space-y-4" use:enhance={withFeedback("Rol creado")}>
					<div class="space-y-2">
						<label class="text-sm font-medium" for="new-role-name">Nombre del rol</label>
						<Input id="new-role-name" name="nombre" placeholder="Ej: Moderador" required />
					</div>

					<div class="space-y-3">
						<p class="text-sm font-medium">Permisos del rol</p>
						<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{#each data.permissions as permission}
								<label class="flex items-center gap-2 rounded-md border p-2 text-sm">
									<input type="checkbox" name="permisos" value={permission} />
									<span>{getPermissionLabel(permission)}</span>
								</label>
							{/each}
						</div>
					</div>

					<Button type="submit">Crear rol</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 lg:grid-cols-2">
			{#if data.roles.length === 0}
				<Card.Root class="lg:col-span-2">
					<Card.Header>
						<Card.Title>No hay roles creados</Card.Title>
						<Card.Description>Crea el primer rol para empezar a asignar permisos.</Card.Description>
					</Card.Header>
				</Card.Root>
			{/if}

			{#each data.roles as role}
				<Card.Root>
					<Card.Header>
						<Card.Title>{role.nombre}</Card.Title>
						<Card.Description>
							<span class="inline-flex items-center gap-2">
								<Badge variant="outline">{role.users_count} usuarios</Badge>
								<span>{role.permisos.length} permisos configurados</span>
							</span>
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<form
							method="POST"
							action="?/update_role"
							class="space-y-4"
							use:enhance={withFeedback("Rol actualizado")}
						>
							<input type="hidden" name="roleId" value={role.id} />

							<div class="space-y-2">
								<label class="text-sm font-medium" for={`name-${role.id}`}>Nombre</label>
								<Input id={`name-${role.id}`} name="nombre" value={role.nombre} required />
							</div>

							<div class="space-y-3">
								<p class="text-sm font-medium">Permisos</p>
								<div class="grid gap-2 sm:grid-cols-2">
									{#each data.permissions as permission}
										<label class="flex items-center gap-2 rounded-md border p-2 text-sm">
											<input
												type="checkbox"
												name="permisos"
												value={permission}
												checked={role.permisos.includes(permission)}
											/>
											<span>{getPermissionLabel(permission)}</span>
										</label>
									{/each}
								</div>
							</div>

							<div class="flex flex-wrap gap-2">
								<Button type="submit">Guardar cambios</Button>
							</div>
						</form>

						<form method="POST" action="?/delete_role" class="mt-3" use:enhance={withFeedback("Rol eliminado")}>
							<input type="hidden" name="roleId" value={role.id} />
							<Button type="submit" variant="destructive">Eliminar rol</Button>
						</form>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</section>
