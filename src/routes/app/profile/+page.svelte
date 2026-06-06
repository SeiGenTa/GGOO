<script lang="ts">
    import * as Card from '$lib/components/ui/card'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'
    import * as Alert from '$lib/components/ui/alert/index.js'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Badge } from '$lib/components/ui/badge'
    import {
        Field,
        FieldDescription,
        FieldGroup,
        FieldLabel,
    } from '$lib/components/ui/field'
    import { Calendar } from '$lib/components/ui/calendar'
    import * as Popover from '$lib/components/ui/popover'
    import type { PageProps } from './$types'
    import AlertCircleIcon from '@lucide/svelte/icons/alert-circle'
    import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
    import { enhance } from '$app/forms'
    import {
        CalendarDate,
        getLocalTimeZone,
        today,
        type DateValue,
    } from '@internationalized/date'

    const positionOptions = ['Punta', 'Centro', 'Armador', 'Libero', 'Opuesto']

    let { data, form }: PageProps = $props()

    let nameDialogOpen = $state(false)
    let emailDialogOpen = $state(false)
    let selectedPositions = $state<string[]>([])
    let nameDraft = $state('')
    let emailDraft = $state('')
    let nameConfirmation = $state(false)
    let emailConfirmation = $state(false)
    let cumpleanosValue = $state<DateValue | undefined>(undefined)
    let cumpleanosPopoverOpen = $state(false)

    const currentPositions = $derived(
        form?.success && Array.isArray(form.positions)
            ? form.positions
            : data.user.posiciones
    )
    const cumpleanosSaved = $derived.by(() => {
        if (form && 'cumpleanos' in form) {
            return form.cumpleanos ?? null
        }
        return data.user.cumpleanos
    })
    const cumpleanosDisplay = $derived.by(() => {
        if (!cumpleanosSaved) return null
        const d = new Date(cumpleanosSaved)
        if (Number.isNaN(d.getTime())) return null
        return new Intl.DateTimeFormat('es-CL', {
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
        }).format(d)
    })
    const cumpleanosHiddenValue = $derived.by(() => {
        if (!cumpleanosValue) return ''
        const y = cumpleanosValue.year.toString().padStart(4, '0')
        const m = cumpleanosValue.month.toString().padStart(2, '0')
        const d = cumpleanosValue.day.toString().padStart(2, '0')
        return `${y}-${m}-${d}`
    })
    const cumpleanosButtonLabel = $derived.by(() => {
        if (!cumpleanosValue) return 'Selecciona una fecha'
        const monthName = new Intl.DateTimeFormat('es-CL', {
            month: 'long',
            timeZone: 'UTC',
        }).format(
            new Date(
                Date.UTC(1900, cumpleanosValue.month - 1, cumpleanosValue.day)
            )
        )
        return `${cumpleanosValue.day} de ${monthName}`
    })
    const cumpleanosHasSavedValue = $derived(cumpleanosSaved != null)
    const cumpleanosToday = today(getLocalTimeZone())
    const availablePositions = $derived(
        positionOptions.filter(
            (position) => !selectedPositions.includes(position)
        )
    )
    const positionsReady = $derived(
        selectedPositions.length === positionOptions.length
    )

    const addPosition = (position: string) => {
        if (selectedPositions.includes(position)) {
            return
        }
        if (selectedPositions.length >= positionOptions.length) {
            return
        }

        if (ViewTransition) {
            document.startViewTransition(() => {
                selectedPositions = [...selectedPositions, position]
            })
        } else {
            selectedPositions = [...selectedPositions, position]
        }
    }

    const removePosition = (index: number) => {
        if (ViewTransition) {
            document.startViewTransition(() => {
                selectedPositions = selectedPositions.filter(
                    (_, currentIndex) => currentIndex !== index
                )
            })
        } else {
            selectedPositions = selectedPositions.filter(
                (_, currentIndex) => currentIndex !== index
            )
        }
    }

    $effect(() => {
        selectedPositions = Array.from(
            new Set(
                data.user.posiciones.filter((position) =>
                    positionOptions.includes(position)
                )
            )
        ).slice(0, positionOptions.length)
        nameDraft = data.user.nombre
        emailDraft = data.user.email
    })

    $effect(() => {
        if (!cumpleanosSaved) {
            cumpleanosValue = undefined
            return
        }
        const d = new Date(cumpleanosSaved)
        if (Number.isNaN(d.getTime())) {
            cumpleanosValue = undefined
            return
        }
        cumpleanosValue = new CalendarDate(
            d.getUTCFullYear(),
            d.getUTCMonth() + 1,
            d.getUTCDate()
        )
    })
</script>

<section class="mx-auto w-full max-w-3xl space-y-6 px-3 py-6">
    <Card.Root>
        <Card.Header>
            <Card.Title>Mi perfil</Card.Title>
            <Card.Description
                >Actualiza los datos principales de tu cuenta.</Card.Description
            >
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
                    <Alert.Description
                        >{form.message ??
                            'Tus datos fueron actualizados correctamente.'}</Alert.Description
                    >
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
            <Card.Description
                >Puedes definir o corregir tu apodo visible.</Card.Description
            >
        </Card.Header>
        <Card.Content>
            <form
                method="POST"
                action="?/set_user"
                class="space-y-4"
                use:enhance
            >
                <FieldGroup>
                    <Field>
                        <FieldLabel for="apodo">Apodo</FieldLabel>
                        <Input
                            id="apodo"
                            name="apodo"
                            value={data.user.apodo ?? ''}
                            placeholder="Tu apodo"
                            maxlength={80}
                        />
                        <FieldDescription
                            >Déjalo vacío si prefieres no usar apodo.</FieldDescription
                        >
                    </Field>
                </FieldGroup>

                <Button type="submit">Guardar apodo</Button>
            </form>
        </Card.Content>
    </Card.Root>
    <section id="positions" class="space-y-6">
        <Card.Root>
            <Card.Header>
                <Card.Title>Posiciones</Card.Title>
                <Card.Description>
                    Presiona un badge para agregarlo al orden de preferencia.
                    Presiona un badge en tu lista para quitarlo.
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="rounded-md border bg-muted/30 p-3">
                    <p class="text-sm text-muted-foreground">
                        Orden actual guardado
                    </p>
                    {#if currentPositions.length > 0}
                        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                            {#each currentPositions as position}
                                <li>{position}</li>
                            {/each}
                        </ol>
                    {:else}
                        <p class="mt-2 text-sm text-muted-foreground">
                            Todavía no has definido tus posiciones.
                        </p>
                    {/if}
                </div>

                <form
                    method="POST"
                    action="?/set_positions"
                    class="space-y-4"
                    use:enhance
                >
                    {#each positionOptions as _, index}
                        <input
                            type="hidden"
                            name={`position_${index + 1}`}
                            value={selectedPositions[index] ?? ''}
                        />
                    {/each}

                    <FieldGroup>
                        <Field>
                            <FieldLabel>Posiciones disponibles</FieldLabel>
                            <div
                                class="flex flex-wrap gap-2 rounded-md border p-3"
                            >
                                {#if availablePositions.length > 0}
                                    {#each availablePositions as position}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                addPosition(position)}
                                        >
                                            <Badge
                                                style={`view-transition-name: ${position}`}
                                                variant="outline"
                                                class="cursor-pointer hover:bg-muted"
                                                >{position}</Badge
                                            >
                                        </button>
                                    {/each}
                                {:else}
                                    <p class="text-sm text-muted-foreground">
                                        Ya agregaste las 5 posiciones.
                                    </p>
                                {/if}
                            </div>
                        </Field>

                        <Field>
                            <FieldLabel>Tu orden de preferencia</FieldLabel>
                            <div
                                class="flex min-h-14 flex-wrap gap-2 rounded-md border p-3"
                            >
                                {#if selectedPositions.length > 0}
                                    {#each selectedPositions as position, index}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                removePosition(index)}
                                        >
                                            <Badge
                                                style={`view-transition-name: ${position}`}
                                                class="cursor-pointer"
                                                >{index + 1}. {position}</Badge
                                            >
                                        </button>
                                    {/each}
                                {:else}
                                    <p class="text-sm text-muted-foreground">
                                        Aun no seleccionas posiciones.
                                    </p>
                                {/if}
                            </div>
                        </Field>
                    </FieldGroup>

                    <FieldDescription>
                        Debes completar las cinco posiciones sin repetir
                        ninguna. Si falta una, vuelve a intentar.
                    </FieldDescription>

                    <Button type="submit" disabled={!positionsReady}
                        >Guardar posiciones</Button
                    >
                </form>
            </Card.Content>
        </Card.Root>
    </section>

    <section id="cumpleanos" class="space-y-6">
        <Card.Root>
            <Card.Header>
                <Card.Title>Cumpleaños</Card.Title>
                <Card.Description>
                    Registra tu fecha de cumpleaños. Solo guardamos el día y el
                    mes; el año no se almacena.
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="rounded-md border bg-muted/30 p-3">
                    <p class="text-sm text-muted-foreground">
                        Fecha registrada
                    </p>
                    {#if cumpleanosDisplay}
                        <p class="mt-1 text-sm font-medium">
                            Tu cumpleaños es el {cumpleanosDisplay}.
                        </p>
                    {:else}
                        <p class="mt-1 text-sm text-muted-foreground">
                            Aún no has registrado tu fecha de cumpleaños.
                        </p>
                    {/if}
                </div>

                <form
                    method="POST"
                    action="?/set_cumpleanos"
                    class="space-y-4"
                    use:enhance
                >
                    <FieldGroup>
                        <Field>
                            <FieldLabel for="cumpleanos-trigger"
                                >Fecha de cumpleaños</FieldLabel
                            >
                            <input
                                id="cumpleanos-trigger"
                                type="hidden"
                                name="cumpleanos"
                                value={cumpleanosHiddenValue}
                            />
                            <Popover.Root bind:open={cumpleanosPopoverOpen}>
                                <Popover.Trigger>
                                    {#snippet child({ props })}
                                        <Button
                                            {...props}
                                            variant="outline"
                                            class="w-64 justify-between font-normal"
                                        >
                                            <span
                                                class={cumpleanosValue
                                                    ? ''
                                                    : 'text-muted-foreground'}
                                            >
                                                {cumpleanosButtonLabel}
                                            </span>
                                            <ChevronDownIcon />
                                        </Button>
                                    {/snippet}
                                </Popover.Trigger>
                                <Popover.Content
                                    class="w-auto overflow-hidden p-0"
                                    align="start"
                                >
                                    <Calendar
                                        type="single"
                                        bind:value={cumpleanosValue}
                                        placeholder={cumpleanosToday}
                                        captionLayout="dropdown"
                                        maxValue={cumpleanosToday}
                                        onValueChange={() => {
                                            cumpleanosPopoverOpen = false
                                        }}
                                    />
                                </Popover.Content>
                            </Popover.Root>
                            <FieldDescription>
                                Selecciona el día y mes de tu cumpleaños. El año
                                se descarta al guardar.
                            </FieldDescription>
                        </Field>
                    </FieldGroup>

                    <div class="flex flex-wrap gap-2">
                        <Button type="submit" disabled={!cumpleanosValue}
                            >Guardar cumpleaños</Button
                        >
                    </div>
                </form>

                {#if cumpleanosHasSavedValue}
                    <form method="POST" action="?/set_cumpleanos" use:enhance>
                        <input type="hidden" name="cumpleanos" value="" />
                        <Button type="submit" variant="outline"
                            >Quitar fecha de cumpleaños</Button
                        >
                    </form>
                {/if}
            </Card.Content>
        </Card.Root>
    </section>

    <Card.Root>
        <Card.Header>
            <Card.Title>Nombre</Card.Title>
            <Card.Description
                >Cambiar el nombre requiere revisión de administrador.</Card.Description
            >
        </Card.Header>
        <Card.Content class="space-y-4">
            <FieldGroup>
                <Field>
                    <FieldLabel for="nombre">Nombre completo</FieldLabel>
                    <Input
                        id="nombre"
                        name="nombre"
                        bind:value={nameDraft}
                        required
                        minlength={3}
                        maxlength={120}
                    />
                </Field>
            </FieldGroup>

            <Button
                type="button"
                variant="destructive"
                onclick={() => {
                    nameConfirmation = false
                    nameDialogOpen = true
                }}
            >
                Cambiar nombre
            </Button>
        </Card.Content>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Correo electrónico</Card.Title>
            <Card.Description
                >Al cambiar tu correo, deberás validarlo nuevamente.</Card.Description
            >
        </Card.Header>
        <Card.Content class="space-y-4">
            <FieldGroup>
                <Field>
                    <FieldLabel for="email">Nuevo correo</FieldLabel>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        bind:value={emailDraft}
                        required
                    />
                </Field>
            </FieldGroup>

            <Button
                type="button"
                variant="outline"
                onclick={() => {
                    emailConfirmation = false
                    emailDialogOpen = true
                }}
            >
                Cambiar correo
            </Button>
        </Card.Content>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Contraseña</Card.Title>
            <Card.Description
                >Actualiza tu contraseña para mantener segura tu cuenta.</Card.Description
            >
        </Card.Header>
        <Card.Content>
            <form
                method="POST"
                action="?/set_password"
                class="space-y-4"
                use:enhance
            >
                <FieldGroup>
                    <Field>
                        <FieldLabel for="current_password"
                            >Contraseña actual</FieldLabel
                        >
                        <Input
                            id="current_password"
                            name="current_password"
                            type="password"
                            required
                        />
                    </Field>
                    <Field>
                        <FieldLabel for="new_password"
                            >Nueva contraseña</FieldLabel
                        >
                        <Input
                            id="new_password"
                            name="new_password"
                            type="password"
                            minlength={8}
                            required
                        />
                    </Field>
                    <Field>
                        <FieldLabel for="confirm_password"
                            >Confirmar nueva contraseña</FieldLabel
                        >
                        <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            minlength={8}
                            required
                        />
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
                    Al cambiar el nombre, el nuevo nombre debe ser validado por
                    administrador bloqueando al usuario hasta esto.
                {:else}
                    Tu nombre será actualizado inmediatamente sin necesidad de
                    validación adicional.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        <form
            method="POST"
            action="?/set_name"
            id="set-name-form"
            class="space-y-3"
            use:enhance
        >
            <div class="rounded-md border bg-muted/30 p-3 text-sm">
                <p class="text-muted-foreground">Nuevo nombre:</p>
                <p class="font-medium">{nameDraft}</p>
            </div>
            <label class="flex items-start gap-2 rounded-md border p-3 text-sm">
                <input
                    type="checkbox"
                    bind:checked={nameConfirmation}
                    class="mt-1"
                />
                <span>
                    {#if form?.willBlock !== false}
                        Confirmo que entiendo que mi cuenta quedará bloqueada
                        hasta la validación del administrador.
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
            <Button
                type="submit"
                form="set-name-form"
                variant="destructive"
                disabled={!nameConfirmation || nameDraft.trim().length < 3}
            >
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
                    Se requerirá validar tu correo nuevamente bloqueando tu
                    acceso hasta que confirmes.
                {:else}
                    Tu correo será actualizado inmediatamente. Se enviará un
                    correo de notificación.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        <form
            method="POST"
            action="?/set_email"
            id="set-email-form"
            class="space-y-3"
            use:enhance
        >
            <div class="rounded-md border bg-muted/30 p-3 text-sm">
                <p class="text-muted-foreground">Nuevo correo:</p>
                <p class="font-medium">{emailDraft}</p>
            </div>
            <label class="flex items-start gap-2 rounded-md border p-3 text-sm">
                <input
                    type="checkbox"
                    bind:checked={emailConfirmation}
                    class="mt-1"
                />
                <span>
                    {#if form?.willBlock !== false}
                        Confirmo que entiendo que puede requerirse revalidación
                        del correo para continuar usando la cuenta.
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
            <Button
                type="submit"
                form="set-email-form"
                variant="destructive"
                disabled={!emailConfirmation || emailDraft.trim().length === 0}
            >
                Confirmar cambio
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
