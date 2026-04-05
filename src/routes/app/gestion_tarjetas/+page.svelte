<script lang="ts">
    import * as Card from "$lib/components/ui/card";
</script>

<div class="container mx-auto max-w-5xl space-y-6 p-4">
    <section class="rounded-2xl border bg-linear-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-6 shadow-sm">
        <p class="text-sm font-medium text-muted-foreground">Panel administrativo</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Gestión de tarjetas</h1>
        <p class="mt-3 max-w-3xl text-muted-foreground">
            Este módulo permitirá aplicar sanciones y advertencias de manera ordenada, para mantener
            pichangas más justas, seguras y bien organizadas para toda la comunidad.
        </p>
    </section>

    <Card.Root class="shadow-sm">
        <Card.Header>
            <Card.Title>Estado del módulo</Card.Title>
            <Card.Description>Versión para administradores y moderadores con permisos</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
            <p>
                Esta sección aún no está desarrollada por completo. Aquí, los administradores
                (o quienes tengan permisos) podrán asignar, editar y revocar tarjetas.
            </p>
            <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Registro histórico de tarjetas por jugador.</li>
                <li>Control por tipo de tarjeta y fecha de aplicación.</li>
                <li>Trazabilidad de cambios para mayor transparencia.</li>
            </ul>
        </Card.Content>
    </Card.Root>
</div>