# Jugadores — Estadísticas de Rendimiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una vista de administración `/app/jugadores` que muestra todos los usuarios como jugadores con estadísticas de rendimiento editables (Ataque, Recepción, Bloqueo, Saque, Armada, escala 1–10), accesible desde el sidebar.

**Architecture:** Se agregan 5 campos `Int?` directamente al modelo `User` en Prisma. Una nueva ruta `/app/jugadores` protegida por dos permisos nuevos (`VerEstadisticas`, `EditarEstadisticas`) muestra una tabla de jugadores con posición principal/secundaria derivada del array `posiciones[]` existente. El detalle de stats se muestra en un Dialog con formulario editable inline.

**Tech Stack:** SvelteKit, Prisma (PostgreSQL), shadcn-svelte (Card, Dialog, Badge, Button, Input), Lucide Svelte icons, svelte-sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-06-10-jugadores-estadisticas-design.md`

---

## File Map

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modify | `prisma/schema.prisma` | Agregar 5 campos stat al modelo User |
| Modify | `src/lib/permissions.ts` | Agregar VerEstadisticas y EditarEstadisticas |
| Create | `src/routes/app/jugadores/+page.server.ts` | Load de jugadores + acción update_stats |
| Create | `src/routes/app/jugadores/+page.svelte` | Tabla de jugadores + Dialog de stats |
| Modify | `src/lib/components/app/sidebar.svelte` | Agregar entrada "Jugadores" en Administración |

---

## Task 1: Migración de schema — campos de estadísticas

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar los 5 campos stat al modelo `User`**

En `prisma/schema.prisma`, dentro del modelo `User`, agregar después del campo `cumpleanos`:

```prisma
model User {
    // ... campos existentes ...
    cumpleanos          DateTime?
    refreshTokens       RefreshToken[]
    statAtaque          Int?
    statRecepcion       Int?
    statBloqueo         Int?
    statSaque           Int?
    statArmada          Int?
}
```

- [ ] **Step 2: Ejecutar la migración**

```bash
npx prisma migrate dev --name add-stats-jugador
```

Salida esperada:
```
The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260610xxxxxx_add_stats_jugador/
    └─ migration.sql

Your database is now in sync with your schema.
```

- [ ] **Step 3: Verificar que el cliente Prisma se regeneró**

```bash
npx prisma generate
```

Debe completar sin errores. Los campos `statAtaque`, `statRecepcion`, `statBloqueo`, `statSaque`, `statArmada` deben aparecer como `number | null` en el tipo `User` de `generated/prisma/client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add stat fields to User model (ataque, recepcion, bloqueo, saque, armada)"
```

---

## Task 2: Nuevos permisos

**Files:**
- Modify: `src/lib/permissions.ts`

- [ ] **Step 1: Agregar dos permisos al enum**

En `src/lib/permissions.ts`, agregar al final del enum `Permissions`:

```typescript
export enum Permissions {
    VerPartidos = 'ver_partidos',
    CrearPartidos = 'crear_partidos',
    EditarPartidos = 'editar_partidos',
    InscribirsePichanga = 'inscribirse_pichanga',
    AdministrarPichanga = 'administrar_pichanga',
    VerMiembros = 'ver_miembros',
    AceptarMiembros = 'aceptar_miembros',
    CrearRoles = 'crear_roles',
    EditarRoles = 'editar_roles',
    EliminarRoles = 'eliminar_roles',
    VerRolesUsuarios = 'ver_roles_usuarios',
    AsignarRoles = 'asignar_roles',

    // Permisos relacionados con tarjetas
    VerTarjetas = 'ver_tarjetas',
    CrearTarjetas = 'crear_tarjetas',
    EditarTarjetas = 'editar_tarjetas',
    EliminarTarjetas = 'eliminar_tarjetas',

    // Permisos relacionados con estadísticas de jugadores
    VerEstadisticas = 'ver_estadisticas',
    EditarEstadisticas = 'editar_estadisticas',
}
```

- [ ] **Step 2: Verificar que TypeScript no reporta errores**

```bash
npx tsc --noEmit
```

Debe completar sin errores relacionados a `Permissions`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat: add VerEstadisticas and EditarEstadisticas permissions"
```

---

## Task 3: Page server — load y acción update_stats

**Files:**
- Create: `src/routes/app/jugadores/+page.server.ts`

- [ ] **Step 1: Crear el archivo con la función load**

Crear `src/routes/app/jugadores/+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { prisma } from '$utils/prisma.js'
import { Permissions } from '$lib/permissions.js'

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, '/auth')
    }

    if (!locals.user.permisos.includes(Permissions.VerEstadisticas)) {
        redirect(302, '/app?error=No tienes permisos para acceder a esta página.')
    }

    const jugadores = await prisma.user.findMany({
        select: {
            id: true,
            nombre: true,
            apodo: true,
            posiciones: true,
            statAtaque: true,
            statRecepcion: true,
            statBloqueo: true,
            statSaque: true,
            statArmada: true,
        },
        orderBy: { nombre: 'asc' },
    })

    const canEdit = locals.user.permisos.includes(Permissions.EditarEstadisticas)

    return { jugadores, canEdit }
}
```

- [ ] **Step 2: Agregar el helper de validación y la acción update_stats**

Agregar al mismo archivo, a continuación del `load`:

```typescript
function parseStat(raw: FormDataEntryValue | null): number | null | 'invalid' {
    if (raw === null || (raw as string) === '') return null
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 10) return 'invalid'
    return n
}

export const actions: Actions = {
    update_stats: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'No autorizado.' })
        }

        if (!locals.user.permisos.includes(Permissions.EditarEstadisticas)) {
            return fail(403, { message: 'No tienes permisos para editar estadísticas.' })
        }

        const form = await request.formData()
        const userId = (form.get('userId') as string | null)?.trim()

        if (!userId) {
            return fail(400, { message: 'Usuario inválido.' })
        }

        const statAtaque = parseStat(form.get('statAtaque'))
        const statRecepcion = parseStat(form.get('statRecepcion'))
        const statBloqueo = parseStat(form.get('statBloqueo'))
        const statSaque = parseStat(form.get('statSaque'))
        const statArmada = parseStat(form.get('statArmada'))

        if (
            statAtaque === 'invalid' ||
            statRecepcion === 'invalid' ||
            statBloqueo === 'invalid' ||
            statSaque === 'invalid' ||
            statArmada === 'invalid'
        ) {
            return fail(400, { message: 'Los valores de estadísticas deben ser enteros entre 1 y 10.' })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        })

        if (!user) {
            return fail(404, { message: 'El usuario no existe.' })
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                statAtaque: statAtaque as number | null,
                statRecepcion: statRecepcion as number | null,
                statBloqueo: statBloqueo as number | null,
                statSaque: statSaque as number | null,
                statArmada: statArmada as number | null,
            },
        })

        return { success: true, message: 'Estadísticas actualizadas correctamente.' }
    },
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

No debe haber errores en `src/routes/app/jugadores/+page.server.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/app/jugadores/+page.server.ts
git commit -m "feat: add jugadores page server with load and update_stats action"
```

---

## Task 4: Page Svelte — tabla y dialog

**Files:**
- Create: `src/routes/app/jugadores/+page.svelte`

- [ ] **Step 1: Crear el componente con imports, tipos y estado**

Crear `src/routes/app/jugadores/+page.svelte`:

```svelte
<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit'
    import { enhance } from '$app/forms'
    import { toast } from 'svelte-sonner'
    import * as Card from '$lib/components/ui/card'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Badge } from '$lib/components/ui/badge'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'

    type JugadorRow = {
        id: string
        nombre: string
        apodo: string | null
        posiciones: string[]
        statAtaque: number | null
        statRecepcion: number | null
        statBloqueo: number | null
        statSaque: number | null
        statArmada: number | null
    }

    type PageData = {
        jugadores: JugadorRow[]
        canEdit: boolean
    }

    let { data }: { data: PageData } = $props()

    let selectedJugador = $state<JugadorRow | null>(null)
    let dialogOpen = $state(false)

    const openDialog = (jugador: JugadorRow) => {
        selectedJugador = jugador
        dialogOpen = true
    }

    const STAT_LABELS: Record<keyof Pick<JugadorRow, 'statAtaque' | 'statRecepcion' | 'statBloqueo' | 'statSaque' | 'statArmada'>, string> = {
        statAtaque: 'Ataque',
        statRecepcion: 'Recepción',
        statBloqueo: 'Bloqueo',
        statSaque: 'Saque',
        statArmada: 'Armada',
    }

    const STAT_KEYS = ['statAtaque', 'statRecepcion', 'statBloqueo', 'statSaque', 'statArmada'] as const
    type StatKey = typeof STAT_KEYS[number]

    const hasAnyStats = (j: JugadorRow) =>
        STAT_KEYS.some((k) => j[k] !== null)

    const withFeedback: SubmitFunction = () => {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                const message =
                    (result.data as { message?: string } | null)?.message ??
                    'Estadísticas actualizadas.'
                toast('Guardado', { description: message })
                dialogOpen = false
                selectedJugador = null
                await update()
                return
            }

            if (result.type === 'failure') {
                const message =
                    (result.data as { message?: string } | null)?.message ??
                    'No fue posible guardar.'
                toast('Error', { description: message })
                return
            }

            await update()
        }
    }
</script>
```

- [ ] **Step 2: Agregar el template HTML — tabla**

Agregar a continuación del bloque `<script>`:

```svelte
<section class="space-y-6">
    <Card.Root>
        <Card.Header>
            <Card.Title>Jugadores</Card.Title>
            <Card.Description>
                Estadísticas de rendimiento por jugador. Haz clic en "Ver stats" para editar.
            </Card.Description>
        </Card.Header>
        <Card.Content class="p-0">
            <div class="overflow-x-auto">
                <table class="w-full min-w-180 text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30 text-left">
                            <th class="px-4 py-3 font-semibold">Jugador</th>
                            <th class="px-4 py-3 font-semibold">Pos. Principal</th>
                            <th class="px-4 py-3 font-semibold">Pos. Secundaria</th>
                            <th class="px-4 py-3 font-semibold">Stats</th>
                            <th class="px-4 py-3 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if data.jugadores.length === 0}
                            <tr>
                                <td colspan="5" class="px-4 py-10 text-center text-muted-foreground">
                                    No hay jugadores registrados.
                                </td>
                            </tr>
                        {:else}
                            {#each data.jugadores as jugador}
                                <tr class="border-b align-middle">
                                    <td class="px-4 py-3">
                                        <p class="font-medium">{jugador.nombre}</p>
                                        {#if jugador.apodo}
                                            <p class="text-xs text-muted-foreground">{jugador.apodo}</p>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if jugador.posiciones[0]}
                                            <Badge>{jugador.posiciones[0]}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">—</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if jugador.posiciones[1]}
                                            <Badge variant="outline">{jugador.posiciones[1]}</Badge>
                                        {:else}
                                            <span class="text-muted-foreground">—</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        {#if hasAnyStats(jugador)}
                                            <div class="flex flex-wrap gap-1">
                                                {#each STAT_KEYS as key}
                                                    {#if jugador[key] !== null}
                                                        <Badge variant="secondary" class="text-xs">
                                                            {STAT_LABELS[key].slice(0, 2)}:{jugador[key]}
                                                        </Badge>
                                                    {/if}
                                                {/each}
                                            </div>
                                        {:else}
                                            <span class="text-xs text-muted-foreground">Sin stats</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onclick={() => openDialog(jugador)}
                                        >
                                            Ver stats
                                        </Button>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        </Card.Content>
    </Card.Root>
</section>
```

- [ ] **Step 3: Agregar el Dialog de estadísticas**

Agregar a continuación del `</section>`:

```svelte
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {selectedJugador?.nombre ?? ''}
                {#if selectedJugador?.apodo}
                    <span class="text-muted-foreground font-normal text-base ml-1">({selectedJugador.apodo})</span>
                {/if}
            </Dialog.Title>
            <Dialog.Description class="flex gap-2 flex-wrap pt-1">
                {#if selectedJugador?.posiciones[0]}
                    <Badge>{selectedJugador.posiciones[0]}</Badge>
                {/if}
                {#if selectedJugador?.posiciones[1]}
                    <Badge variant="outline">{selectedJugador.posiciones[1]}</Badge>
                {/if}
                {#if !selectedJugador?.posiciones[0] && !selectedJugador?.posiciones[1]}
                    <span class="text-muted-foreground text-xs">Sin posiciones definidas</span>
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if selectedJugador}
            <!-- Visualización de stats actuales -->
            <div class="space-y-3 py-2">
                {#each STAT_KEYS as key}
                    {@const val = selectedJugador[key]}
                    <div class="grid grid-cols-[100px_1fr_28px] items-center gap-3">
                        <span class="text-sm font-medium">{STAT_LABELS[key]}</span>
                        <div class="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                class="h-2 bg-primary rounded-full transition-all"
                                style="width: {val !== null ? (val / 10) * 100 : 0}%"
                            ></div>
                        </div>
                        <span class="text-sm font-semibold text-right">
                            {val !== null ? val : '—'}
                        </span>
                    </div>
                {/each}
            </div>

            <!-- Formulario de edición (solo si canEdit) -->
            {#if data.canEdit}
                <div class="border-t pt-4">
                    <p class="text-xs text-muted-foreground mb-3">Editar estadísticas (1–10, vacío para borrar)</p>
                    <form
                        method="POST"
                        action="?/update_stats"
                        id="update-stats-form"
                        use:enhance={withFeedback}
                        class="space-y-2"
                    >
                        <input type="hidden" name="userId" value={selectedJugador.id} />
                        {#each STAT_KEYS as key}
                            <div class="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label class="text-sm" for="input-{key}">{STAT_LABELS[key]}</label>
                                <Input
                                    id="input-{key}"
                                    name={key}
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={selectedJugador[key] ?? ''}
                                    placeholder="—"
                                    class="h-8"
                                />
                            </div>
                        {/each}
                    </form>
                </div>
            {/if}
        {/if}

        <Dialog.Footer>
            <Dialog.Close>
                <Button variant="outline">Cerrar</Button>
            </Dialog.Close>
            {#if data.canEdit}
                <Button type="submit" form="update-stats-form">
                    Guardar
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

No debe haber errores en `src/routes/app/jugadores/+page.svelte`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/app/jugadores/+page.svelte
git commit -m "feat: add jugadores page with stats table and dialog"
```

---

## Task 5: Agregar entrada al sidebar

**Files:**
- Modify: `src/lib/components/app/sidebar.svelte`

- [ ] **Step 1: Agregar el import del icono**

En `src/lib/components/app/sidebar.svelte`, en el bloque de imports de iconos de lucide, agregar `ChartNoAxesColumn`:

```svelte
import {
    User,
    Key,
    Users,
    Volleyball,
    BadgeAlertIcon,
    ChartNoAxesColumn,
} from '@lucide/svelte/icons'
```

- [ ] **Step 2: Agregar el item "Jugadores" a la sección Administración**

En el array `sections`, dentro del objeto con `title: 'Administración'`, agregar al final del array `items`:

```typescript
const sections = [
    {
        title: 'General',
        items: [
            { icon: Volleyball, label: 'Pichangas', href: '/app/pichangas' },
            { icon: BadgeAlertIcon, label: 'Mis tarjetas', href: '/app/tarjetas' },
        ],
    },
    {
        title: 'Administración',
        items: [
            { icon: User, label: 'Usuarios', href: '/app/users' },
            { icon: Key, label: 'Roles', href: '/app/roles' },
            { icon: Users, label: 'Permisos', href: '/app/permissions' },
            { icon: BadgeAlertIcon, label: 'Gestion de tarjetas', href: '/app/gestion_tarjetas' },
            { icon: ChartNoAxesColumn, label: 'Jugadores', href: '/app/jugadores' },
        ],
    },
]
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/app/sidebar.svelte
git commit -m "feat: add Jugadores entry to sidebar admin section"
```

---

## Task 6: Verificación manual en el servidor de desarrollo

- [ ] **Step 1: Levantar el servidor de desarrollo**

```bash
pnpm dev
```

Abrir `http://localhost:5173` en el browser.

- [ ] **Step 2: Asignar permisos al rol de admin**

Ir a `/app/roles` con un usuario admin. Editar el rol administrador y agregar los permisos `ver_estadisticas` y `editar_estadisticas`. Guardar.

- [ ] **Step 3: Verificar acceso a la ruta**

Navegar a `/app/jugadores`. Debe:
- Mostrar la tabla con todos los usuarios ordenados por nombre
- Cada fila con posición principal/secundaria (o "—" si no las tienen definidas)
- Columna Stats vacía en "Sin stats" para usuarios sin estadísticas
- Botón "Ver stats" en cada fila

- [ ] **Step 4: Verificar el dialog de edición**

Hacer clic en "Ver stats" de cualquier jugador. Debe:
- Abrir el Dialog con nombre y apodo
- Mostrar las barras de stats (en cero si no hay stats)
- Mostrar el formulario de edición con inputs vacíos
- Al escribir valores 1–10 y guardar: cerrar el dialog, mostrar toast "Guardado", recargar la tabla con los nuevos valores
- Al abrir de nuevo ese jugador: las barras deben reflejar los valores guardados

- [ ] **Step 5: Verificar validaciones**

En el formulario del dialog:
- Ingresar `0` o `11` en cualquier campo y guardar → debe mostrar toast "Error" con mensaje de validación
- Dejar un campo vacío y guardar → ese stat debe guardarse como `null` (barra en 0, muestra "—")

- [ ] **Step 6: Verificar acceso sin permisos**

Con un usuario sin `ver_estadisticas`, navegar a `/app/jugadores`. Debe redirigir a `/app` con mensaje de error.

- [ ] **Step 7: Verificar sidebar**

El ítem "Jugadores" debe aparecer en la sección "Administración" del sidebar con el icono de gráfico y destacarse cuando la ruta activa es `/app/jugadores`.
