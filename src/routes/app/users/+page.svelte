<script lang="ts">
	import type { SubmitFunction } from "@sveltejs/kit";
	import { enhance } from "$app/forms";
	import { toast } from "svelte-sonner";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";

	type UserRow = {
		id: string;
		nombre: string;
		email: string;
		apodo: string | null;
		es_valido: boolean;
		aprobado_por_admin: boolean;
		rechazado_por_admin: boolean;
		roles: Array<{
			id: string;
			nombre: string;
		}>;
	};

	type PageData = {
		blocked: boolean;
		canModerate: boolean;
		users: UserRow[];
		filters?: {
			q: string;
			status: "all" | "pending" | "approved" | "rejected";
		};
		pagination?: {
			page: number;
			totalPages: number;
			totalItems: number;
			hasPrev: boolean;
			hasNext: boolean;
		};
	};

	let { data }: { data: PageData } = $props();

	let userToAccept = $state<UserRow | null>(null);
	let userToReject = $state<UserRow | null>(null);
	let acceptDialogOpen = $state(false);
	let rejectDialogOpen = $state(false);
	let rejectComment = $state("");

	const openAcceptDialog = (user: UserRow) => {
		userToAccept = user;
		acceptDialogOpen = true;
	};

	const openRejectDialog = (user: UserRow) => {
		userToReject = user;
		rejectComment = "";
		rejectDialogOpen = true;
	};

	const withFeedback = (successTitle: string): SubmitFunction => {
		return () => {
			return async ({ result, update }) => {
				if (result.type === "success") {
					const message = (result.data as { message?: string } | null)?.message ?? "Operación completada correctamente.";
					toast(successTitle, { description: message });
					acceptDialogOpen = false;
					rejectDialogOpen = false;
					userToAccept = null;
					userToReject = null;
					rejectComment = "";
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

	const getStatus = (user: UserRow) => {
		if (user.rechazado_por_admin) {
			return { label: "Rechazado", variant: "destructive" as const };
		}

		if (user.aprobado_por_admin || user.es_valido) {
			return { label: "Aprobado", variant: "default" as const };
		}

		return { label: "Pendiente", variant: "outline" as const };
	};

	const buildPageHref = (targetPage: number) => {
		const params = new URLSearchParams();
		const q = data.filters?.q ?? "";
		const status = data.filters?.status ?? "all";

		if (q.length > 0) {
			params.set("q", q);
		}

		params.set("status", status);
		params.set("page", String(targetPage));
		return `/app/users?${params.toString()}`;
	};
</script>

<section class="space-y-6">
	{#if data.blocked}
		<Card.Root>
			<Card.Header>
				<Card.Title>Sin permisos para ver esta sección</Card.Title>
				<Card.Description>
					Necesitas permisos para visualizar o gestionar solicitudes de miembros.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Gestión de usuarios</Card.Title>
				<Card.Description>
					Revisa miembros, filtra por estado y valida o rechaza solicitudes pendientes.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="GET" class="grid gap-3 md:grid-cols-3">
					<div class="md:col-span-2">
						<label class="mb-1 block text-sm font-medium" for="search-users">Buscar usuarios</label>
						<Input id="search-users" name="q" value={data.filters?.q ?? ""} placeholder="Nombre, email o id" />
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium" for="status">Estado</label>
						<select id="status" name="status" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
							<option value="all" selected={(data.filters?.status ?? "all") === "all"}>Todos</option>
							<option value="pending" selected={(data.filters?.status ?? "all") === "pending"}>Pendientes</option>
							<option value="approved" selected={(data.filters?.status ?? "all") === "approved"}>Aprobados</option>
							<option value="rejected" selected={(data.filters?.status ?? "all") === "rejected"}>Rechazados</option>
						</select>
					</div>

					<div class="md:col-span-3 flex flex-wrap gap-2">
						<Button type="submit">Aplicar filtros</Button>
						<Button href="/app/users" variant="outline">Limpiar</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-0">
				<div class="overflow-x-auto">
					<table class="w-full min-w-210 text-sm">
						<thead>
							<tr class="border-b bg-muted/30 text-left">
								<th class="px-4 py-3 font-semibold">ID</th>
								<th class="px-4 py-3 font-semibold">Nombre</th>
								<th class="px-4 py-3 font-semibold">Email</th>
								<th class="px-4 py-3 font-semibold">Estado</th>
								<th class="px-4 py-3 font-semibold">Roles</th>
								<th class="px-4 py-3 font-semibold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#if data.users.length === 0}
								<tr>
									<td colspan="6" class="px-4 py-10 text-center text-muted-foreground">
										No se encontraron usuarios con los filtros actuales.
									</td>
								</tr>
							{:else}
								{#each data.users as user}
									{@const status = getStatus(user)}
									{@const isPending = !user.aprobado_por_admin && !user.rechazado_por_admin}
									<tr class="border-b align-top">
										<td class="px-4 py-3 font-mono text-xs">{user.id}</td>
										<td class="px-4 py-3">
											<p class="font-medium">{user.nombre}</p>
											{#if user.apodo}
												<p class="text-xs text-muted-foreground">Apodo: {user.apodo}</p>
											{/if}
										</td>
										<td class="px-4 py-3">{user.email}</td>
										<td class="px-4 py-3">
											<Badge variant={status.variant}>{status.label}</Badge>
										</td>
										<td class="px-4 py-3">
											<div class="flex flex-wrap gap-1.5">
												{#if user.roles.length === 0}
													<Badge variant="outline">Sin roles</Badge>
												{:else}
													{#each user.roles as role}
														<Badge>{role.nombre}</Badge>
													{/each}
												{/if}
											</div>
										</td>
										<td class="px-4 py-3">
											{#if data.canModerate && isPending}
												<div class="flex flex-wrap gap-2">
													<Button size="sm" onclick={() => openAcceptDialog(user)}>Aceptar</Button>
													<Button size="sm" variant="destructive" onclick={() => openRejectDialog(user)}>Rechazar</Button>
												</div>
											{:else}
												<span class="text-xs text-muted-foreground">Sin acciones</span>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				<div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
					<p class="text-muted-foreground">
						Mostrando página {data.pagination?.page ?? 1} de {data.pagination?.totalPages ?? 1}. Total usuarios: {data.pagination?.totalItems ?? 0}
					</p>
					<div class="flex items-center gap-2">
						<Button
							href={buildPageHref(Math.max(1, (data.pagination?.page ?? 1) - 1))}
							variant="outline"
							disabled={!data.pagination?.hasPrev}
							size="sm"
						>
							Anterior
						</Button>
						<Button
							href={buildPageHref(Math.min(data.pagination?.totalPages ?? 1, (data.pagination?.page ?? 1) + 1))}
							variant="outline"
							disabled={!data.pagination?.hasNext}
							size="sm"
						>
							Siguiente
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</section>

<Dialog.Root bind:open={acceptDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmar aprobación</Dialog.Title>
			<Dialog.Description>
				{#if userToAccept}
					¿Deseas aprobar al usuario {userToAccept.nombre}?
				{:else}
					Selecciona un usuario para continuar.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if userToAccept}
			<form method="POST" action="?/accept_member" id="accept-member-form" use:enhance={withFeedback("Usuario aprobado")}> 
				<input type="hidden" name="userId" value={userToAccept.id} />
			</form>
		{/if}

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Cancelar</Button>
			</Dialog.Close>
			<Button type="submit" form="accept-member-form" disabled={!userToAccept}>Confirmar</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={rejectDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmar rechazo</Dialog.Title>
			<Dialog.Description>
				{#if userToReject}
					¿Deseas rechazar al usuario {userToReject.nombre}? Puedes dejar un comentario.
				{:else}
					Selecciona un usuario para continuar.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if userToReject}
			<form method="POST" action="?/reject_member" id="reject-member-form" class="space-y-3" use:enhance={withFeedback("Usuario rechazado")}>
				<input type="hidden" name="userId" value={userToReject.id} />
				<div class="space-y-1">
					<label class="block text-sm font-medium" for="reject-comment">Comentario</label>
					<textarea
						id="reject-comment"
						name="comment"
						bind:value={rejectComment}
						class="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
						placeholder="Motivo del rechazo (opcional por ahora)"
					></textarea>
				</div>
			</form>
		{/if}

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Cancelar</Button>
			</Dialog.Close>
			<Button type="submit" form="reject-member-form" variant="destructive" disabled={!userToReject}>Confirmar rechazo</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
