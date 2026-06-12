// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user?: {
                id: string
                email: string
                nombre: string
                apodo: string | null
                es_admin: boolean
                /**
                 * Permisos del usuario empaquetados como bitmask.
                 *
                 * Cada permiso del enum `Permissions` se asocia a un bit
                 * (ver `$lib/server/permissions.ts`). El JWT solo viaja
                 * con este entero, no con el array de strings.
                 */
                permisos: number
                posiciones: string[]
                cumpleanos: Date | null
            } | null
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {}
