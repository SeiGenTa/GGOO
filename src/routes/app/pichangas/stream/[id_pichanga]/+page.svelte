<script lang="ts">
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card";
    import * as Item from "$lib/components/ui/item";
    import Separator from "$lib/components/ui/separator/separator.svelte";

    let { data } = $props();
    const pichanga = $derived(data.pichanga);

    const inscrito = $derived(pichanga.inscripciones.some((i) => i.user.id === data.user!.id));
    const admin_partido = $derived(pichanga.admins.some((a) => a.id === data.user!.id));

    const inscritos = $derived(pichanga.inscripciones.slice(0, pichanga.maxJugadores));
    const lista_espera = $derived(pichanga.inscripciones.slice(pichanga.maxJugadores));
</script>

<div class="w-full h-full grid grid-cols-2 gap-4">
    <Card.Root class="col-span-2 row-span-1">
        <Card.Header>
            <Card.Title>{pichanga.nombre ?? `Pinchaga del ${pichanga.fecha}`}</Card.Title>
            <Card.Action>
                {#if data.user!.es_admin}
                    <Button variant="outline" size="sm">Editar</Button>
                {/if}
                {#if !admin_partido}
                    {#if inscrito}
                        <form method="POST" action="?/salir">
                            <Button type="submit" variant="outline" size="sm">Salir</Button>
                        </form>
                    {:else}
                        <form method="POST" action="?/inscribirse">
                            <Button type="submit" variant="default" size="sm">Unirse</Button>
                        </form>
                    {/if}
                {/if}
            </Card.Action>
        </Card.Header>
        <Separator></Separator>
        <Card.Content>
            <div class="h-full grid grid-cols-2">
                <Item.Root variant="default">
                    <Item.Header>
                        <Item.Title>Admins</Item.Title>
                    </Item.Header>
                    <Item.Content>
                        {#each pichanga.admins as admin}
                            <div>{admin.nombre}</div>
                        {/each}
                    </Item.Content>
                </Item.Root>
                <Item.Root variant="default">
                    <Item.Header>
                        <Item.Title>Fecha</Item.Title>
                    </Item.Header>
                    <Item.Content>
                        <div>{pichanga.fecha.toLocaleString()}</div>
                    </Item.Content>
                </Item.Root>
            </div>
        </Card.Content>
    </Card.Root>
    <div class="row-span-3 col-span-2">
        <h2 class="text-xl">Inscritos</h2>
        {#if inscritos.length > 0}
            <ul>
                {#each inscritos as inscripcion, index}
                    <li>{index + 1}: {inscripcion.user.nombre}</li>
                {/each}
            </ul>
        {:else}
            <p>No hay jugadores inscritos.</p>
        {/if}

        {#if lista_espera.length > 0}
            <h2 class="text-xl mt-4">Lista de Espera</h2>
            <ul class="">
                {#each lista_espera as inscripcion, index}
                    <li>{index + pichanga.maxJugadores + 1}: {inscripcion.user.nombre}</li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
