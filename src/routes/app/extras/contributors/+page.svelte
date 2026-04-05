<script lang="ts">
    import * as Card from "$lib/components/ui/card";
</script>

<div class="container mx-auto max-w-4xl space-y-4 p-4">
    <Card.Root class="shadow-sm">
        <Card.Header>
            <Card.Title>Contribuciones</Card.Title>
            <Card.Description>Reconocimiento a quienes colaboran en el desarrollo</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
            <p>
                Aquí se mostrarán los aportes de las personas que han contribuido al proyecto,
                incluyendo mejoras de código, correcciones, documentación y soporte técnico.
            </p>
            <p class="text-sm text-muted-foreground">
                La idea es mantener una sección visible y actualizada para agradecer el trabajo
                colaborativo de la comunidad.
            </p>
        </Card.Content>
    </Card.Root>
</div>