---
name: ggoo-tech-stack
description: 'Use when: working on the GGOO Volley Beauchef codebase — explains the core tech stack (SvelteKit + Prisma + PostgreSQL + shadcn-svelte/TailwindCSS v4) and the project-specific conventions: Prisma client generation in `generated/prisma`, custom path aliases (`$utils`, `$generated`), docker-based dev workflow via Makefile, and the permission/role system. Load before editing routes, schema, components, or DB queries in this repo.'
---

# GGOO Tech Stack & Conventions

A condensed reference for the core technologies and project conventions used in this repository. Load this skill whenever you are about to write or modify code in this codebase so suggestions stay aligned with the existing architecture.

## Core Technologies

| Layer            | Technology                                                      |
| ---------------- | --------------------------------------------------------------- |
| Framework        | **SvelteKit 2** (Svelte 5, runes) with adapter-node             |
| ORM / DB         | **Prisma 7** + **PostgreSQL 17** (via `pg` adapter)             |
| UI components    | **shadcn-svelte** (style: `vega`, baseColor: neutral)           |
| Styling          | **TailwindCSS v4** (via `@tailwindcss/vite`) + `tw-animate-css` |
| Icons            | **lucide-svelte**                                               |
| Headless UI      | **bits-ui**                                                     |
| Validation/forms | **sveltekit-sse**, **svelte-sonner** (toasts)                   |
| Auth             | **jsonwebtoken** + custom refresh token table                   |
| Email            | **resend**                                                      |
| Logging          | **pino**                                                        |
| Package manager  | **pnpm** (with workspace file)                                  |
| Containerization | **Docker** + **docker compose** (multi-stage)                   |

## Path Aliases (from `svelte.config.js`)

| Alias                | Maps to       | Use for                                                      |
| -------------------- | ------------- | ------------------------------------------------------------ |
| `$lib`               | `./src/lib`   | Shared components, utils, hooks, permissions                 |
| `$generated`         | `./generated` | Generated Prisma client                                      |
| `$utils`             | `./src/utils` | Server-side utilities (`prisma.ts`, `user.ts`, `encript.ts`) |
| `$src`               | `./src`       | General source access                                        |
| `$lib/components/ui` | (shadcn)      | shadcn-svelte generated components                           |

Always import the Prisma client as `import { prisma } from '$utils/prisma.js'` (note the `.js` suffix — required by the bundler).

## Prisma Conventions

- **Schema location:** `prisma/schema.prisma`
- **Client output:** `../generated/prisma` (custom path, NOT the default `node_modules/.prisma/client`)
- **Generator:** `prisma-client` (the v7 generator), not the legacy `prisma-client-js`
- **Connection:** `PrismaPg` adapter from `@prisma/adapter-pg` reading `DATABASE_URL` from `.env` (loaded with `dotenv/config` at the top of `src/utils/prisma.ts`)
- **Migrations:** `prisma/migrations/` — always use `make migrate` (runs `prisma migrate dev` in the container) or `make apply-migrate` for deploys
- **Re-generating client:** `make generate-prisma` or `pnpm prisma generate`
- **Studio:** `make prisma-studio`
- **Seed:** `pnpm seed` (runs `tsx prisma/seed.ts`)

### Key models

- `User` — players, with stats fields (`statAtaque`, `statRecepcion`, `statBloqueo`, `statSaque`, `statArmada`), `posiciones`, `cumpleanos`
- `Pichanga` — volleyball match event with `fecha`, `fechaInicioIncripcion`, `maxJugadores`
- `Inscripcion` — join table linking users to pichangas
- `Rol` — role definition with a `permisos: String[]` and `is_default` flag
- `Tarjetas` — card/discipline system (cards assigned to and by users)
- `Castigo` — punishment/penalty
- `RefreshToken` — JWT refresh token storage with IP/UA tracking

## shadcn-svelte Conventions

- Config: `components.json` — style `vega`, baseColor `neutral`, icon library `lucide`
- Generated UI primitives live in `src/lib/components/ui/`
- Domain-specific composed components live in `src/lib/components/app/`
- The `cn(...)` helper in `src/lib/utils.ts` (uses `clsx` + `tailwind-merge`) is the standard way to compose class names
- Add new components with `pnpm dlx shadcn-svelte@latest add <component>`

## Page & Server Conventions

SvelteKit `+page.server.ts` files in this repo follow a consistent pattern (see `src/routes/app/jugadores/+page.server.ts`):

1. **Auth guard** at the top of `load`: check `locals.user`, else `redirect(302, '/auth')`
2. **Permission guard**: verify required permission via `locals.user.permisos.includes(Permissions.X)`, else redirect to `/app?error=...`
3. **Data load** with `prisma` — use `select` to avoid over-fetching; `orderBy` for stable ordering
4. **Expose permission flags** to the page (e.g. `canEdit`) so the UI can hide controls
5. **`actions`**: always re-check auth + permission, validate form input with explicit parsing, return `fail(4xx, {...})` on errors

## Permission System

`src/lib/permissions.ts` defines a `Permissions` enum of string keys stored on `User.permisos` and `Rol.permisos`. Always reference permissions through the enum — never hardcode string literals in route logic.

## Development Workflow

All commands run inside the Docker container unless noted:

```bash
make dev              # Start the app service (runs migrations then pnpm dev)
make bash             # Open a shell in the app container
make migrate          # prisma migrate dev
make apply-migrate    # prisma migrate deploy
make generate-prisma  # regenerate Prisma client after schema changes
make createsuperuser  # run src/manage.ts createsuperuser
make prisma-studio    # browse the DB
```

Outside the container you can use `pnpm` directly if you have a local Postgres and `.env`.

## Environment

- `.env` is optional in dev — defaults exist for Postgres credentials and port
- Use `template.env` as a reference for required variables
- Production env vars required: `DATABASE_URL`, `POSTGRES_*`, `PORT_APP`, plus JWT/Resend keys
- Logs are written to `./app.logs/` in production

## Style & Type Rules

- TypeScript strict mode is on (`tsconfig.json` extends `.svelte-kit/tsconfig.json`)
- Svelte 5 runes syntax (`$state`, `$derived`, `$props`, `$effect`)
- ESLint/Prettier: `prettier-plugin-svelte` and `prettier-plugin-prisma` are configured
- Run `pnpm check` to type-check (runs `svelte-kit sync && svelte-check`)

## Things to Avoid

- ❌ Don't import the Prisma client from `@prisma/client` — it's generated to `generated/prisma/client`
- ❌ Don't bypass `locals.user` auth checks in `+page.server.ts` or `+server.ts`
- ❌ Don't hardcode permission strings — always import from `$lib/permissions.js`
- ❌ Don't edit files in `generated/prisma/` — they're regenerated from the schema
- ❌ Don't use `node_modules/.prisma/client` paths — the custom generator output is `generated/prisma`
