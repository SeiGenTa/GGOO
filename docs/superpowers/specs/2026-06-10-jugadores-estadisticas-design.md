# Jugadores — Estadísticas de Rendimiento

**Fecha:** 2026-06-10  
**Estado:** Aprobado

## Resumen

Nueva sección de administración que expone a los usuarios como entidades "jugador" con estadísticas de rendimiento editables. Solo visible y editable por administradores con los permisos correspondientes.

---

## Schema (Prisma)

Agregar 5 campos opcionales a `User` en `prisma/schema.prisma`:

```prisma
statAtaque     Int?
statRecepcion  Int?
statBloqueo    Int?
statSaque      Int?
statArmada     Int?
```

- Valores válidos: enteros entre 1 y 10 inclusive, o `null` (sin stat asignada).
- Requiere una migración: `prisma migrate dev --name add-stats-jugador`.

---

## Permisos

Agregar al enum `Permissions` en `src/lib/permissions.ts`:

```ts
VerEstadisticas    = 'ver_estadisticas'
EditarEstadisticas = 'editar_estadisticas'
```

Los admins deben tener ambos permisos asignados a través del sistema de roles existente.

---

## Ruta

`src/routes/app/jugadores/`  
- `+page.server.ts` — load + action  
- `+page.svelte` — tabla + dialog

### Load

- Requiere `Permissions.VerEstadisticas`; si no cumple → `redirect(302, '/app?error=...')`.
- Query:
  ```ts
  prisma.user.findMany({
    select: {
      id: true, nombre: true, apodo: true, posiciones: true,
      statAtaque: true, statRecepcion: true, statBloqueo: true,
      statSaque: true, statArmada: true,
    },
    orderBy: { nombre: 'asc' },
  })
  ```
- Sin paginación en esta versión.
- Retorna además `canEdit: boolean` (si tiene `Permissions.EditarEstadisticas`).

### Action `update_stats`

- Requiere `Permissions.EditarEstadisticas`; si no cumple → `fail(403, ...)`.
- Recibe por `FormData`: `userId`, `statAtaque`, `statRecepcion`, `statBloqueo`, `statSaque`, `statArmada`.
- Validación: cada stat debe ser entero 1–10 o vacío (→ `null`). Si un valor es inválido → `fail(400, ...)`.
- Ejecuta `prisma.user.update({ where: { id: userId }, data: { statAtaque, ... } })`.

---

## Sidebar

Agregar en la sección `Administración` de `src/lib/components/app/sidebar.svelte`:

```ts
{ icon: ChartNoAxesColumn, label: 'Jugadores', href: '/app/jugadores' }
```

Importar `ChartNoAxesColumn` desde `@lucide/svelte/icons`.

---

## UI

### Tabla

Columnas:

| Nombre / Apodo | Pos. Principal | Pos. Secundaria | Stats | Acciones |
|---|---|---|---|---|
| nombre + apodo en gris debajo | `posiciones[0]` badge accent | `posiciones[1]` badge outline | badges compactos `A:n R:n B:n S:n Ar:n` | botón "Ver stats" |

- `posiciones[0]` = posición principal, `posiciones[1]` = secundaria.
- Si `posiciones` está vacío o no tiene suficientes elementos: muestra "—".
- Si todas las stats son `null`: muestra "Sin stats" en `text-muted-foreground`.

### Dialog de estadísticas

Se abre al hacer clic en "Ver stats".

**Header:** nombre del jugador, apodo (si existe), badges de posición principal y secundaria.

**Sección visualización:** para cada stat con valor asignado:
- Etiqueta + barra de progreso (ancho = `valor/10 * 100%`) + valor numérico.
- Stats con valor `null` no se muestran en esta sección (o se indica "—").

**Sección edición** (visible solo si `canEdit`):
- 5 inputs `type="number" min="1" max="10"` pre-cargados con valores actuales (vacíos si son `null`).
- Formulario POST a `?/update_stats` con `use:enhance`.
- Al éxito: cierra dialog, muestra toast de confirmación, recarga página (`await update()`).
- Al error: muestra toast de error, mantiene dialog abierto.
- Dejar un campo vacío → guarda `null` (elimina el stat).

---

## Invariantes

- Un usuario sin `VerEstadisticas` nunca llega a ver esta ruta (redirect en load).
- Un usuario sin `EditarEstadisticas` no ve la sección de edición del dialog (`canEdit = false`).
- Los valores de stats siempre son `null` o enteros en `[1, 10]`; nunca se persiste un valor fuera de ese rango.
- `posiciones[0]` y `posiciones[1]` provienen del array ya existente que el usuario gestiona desde su perfil; esta feature no los modifica.
