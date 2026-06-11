import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createHash } from 'node:crypto'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const hashPassword = (password: string) =>
    createHash('blake2b512').update(password).digest('hex')

// Contraseña para todos los usuarios de prueba: test1234
const PASSWORD = hashPassword('test1234')

const POSITIONS = ['Punta', 'Centro', 'Armador', 'Libero', 'Opuesto']

const ALL_PERMISOS = [
    'ver_partidos',
    'crear_partidos',
    'editar_partidos',
    'inscribirse_pichanga',
    'administrar_pichanga',
    'ver_miembros',
    'aceptar_miembros',
    'crear_roles',
    'editar_roles',
    'eliminar_roles',
    'ver_roles_usuarios',
    'asignar_roles',
    'ver_tarjetas',
    'crear_tarjetas',
    'editar_tarjetas',
    'eliminar_tarjetas',
    'ver_estadisticas',
    'editar_estadisticas',
]

const jugadoresData = [
    {
        nombre: 'Carlos Mendoza',
        apodo: 'Carlitos',
        email: 'carlos@test.com',
        posiciones: ['Punta', 'Opuesto'],
        statAtaque: 9,
        statRecepcion: 7,
        statBloqueo: 6,
        statSaque: 8,
        statArmada: null,
    },
    {
        nombre: 'Diego Herrera',
        apodo: 'Diegote',
        email: 'diego@test.com',
        posiciones: ['Centro', 'Punta'],
        statAtaque: 8,
        statRecepcion: 5,
        statBloqueo: 9,
        statSaque: 7,
        statArmada: null,
    },
    {
        nombre: 'Matías Rojas',
        apodo: 'Mati',
        email: 'matias@test.com',
        posiciones: ['Armador', 'Centro'],
        statAtaque: 5,
        statRecepcion: 7,
        statBloqueo: 4,
        statSaque: 6,
        statArmada: 10,
    },
    {
        nombre: 'Felipe Soto',
        apodo: null,
        email: 'felipe@test.com',
        posiciones: ['Libero', 'Punta'],
        statAtaque: 3,
        statRecepcion: 10,
        statBloqueo: 2,
        statSaque: 6,
        statArmada: null,
    },
    {
        nombre: 'Andrés Vidal',
        apodo: 'El Androide',
        email: 'andres@test.com',
        posiciones: ['Opuesto', 'Centro'],
        statAtaque: 9,
        statRecepcion: 6,
        statBloqueo: 8,
        statSaque: 9,
        statArmada: null,
    },
    {
        nombre: 'Sebastián Muñoz',
        apodo: 'Seba',
        email: 'sebastian@test.com',
        posiciones: ['Punta', 'Libero'],
        statAtaque: 7,
        statRecepcion: 8,
        statBloqueo: 5,
        statSaque: 7,
        statArmada: null,
    },
    {
        nombre: 'Pablo Fuentes',
        apodo: 'Pablito',
        email: 'pablo@test.com',
        posiciones: ['Centro', 'Opuesto'],
        statAtaque: 7,
        statRecepcion: 4,
        statBloqueo: 8,
        statSaque: 5,
        statArmada: null,
    },
    {
        nombre: 'Ignacio Torres',
        apodo: 'Nacho',
        email: 'ignacio@test.com',
        posiciones: ['Armador'],
        statAtaque: 4,
        statRecepcion: 6,
        statBloqueo: 3,
        statSaque: 5,
        statArmada: 9,
    },
    {
        nombre: 'Rodrigo Cabrera',
        apodo: null,
        email: 'rodrigo@test.com',
        posiciones: [],
        statAtaque: null,
        statRecepcion: null,
        statBloqueo: null,
        statSaque: null,
        statArmada: null,
    },
    {
        nombre: 'Tomás Núñez',
        apodo: 'Tomi',
        email: 'tomas@test.com',
        posiciones: ['Libero'],
        statAtaque: 2,
        statRecepcion: 9,
        statBloqueo: 1,
        statSaque: 5,
        statArmada: null,
    },
]

async function main() {
    console.log('Limpiando datos existentes...')
    await prisma.inscripcion.deleteMany()
    await prisma.pichanga.deleteMany()
    await prisma.tarjetas.deleteMany()
    await prisma.castigo.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.rol.deleteMany()
    await prisma.user.deleteMany()

    console.log('Creando usuarios de prueba...')

    // Admin con todos los permisos
    const admin = await prisma.user.create({
        data: {
            nombre: 'Admin Test',
            apodo: 'Admin',
            email: 'admin@test.com',
            password: PASSWORD,
            es_admin: true,
            es_valido: true,
            aprobado_por_admin: true,
            permisos: ALL_PERMISOS,
            posiciones: POSITIONS,
            statAtaque: 8,
            statRecepcion: 7,
            statBloqueo: 6,
            statSaque: 7,
            statArmada: 8,
        },
    })
    console.log(`  Admin creado: ${admin.email}`)

    // Usuario con solo ver_estadisticas
    const viewer = await prisma.user.create({
        data: {
            nombre: 'Viewer Test',
            apodo: 'Viewer',
            email: 'viewer@test.com',
            password: PASSWORD,
            es_admin: false,
            es_valido: true,
            aprobado_por_admin: true,
            permisos: [
                'ver_estadisticas',
                'ver_partidos',
                'inscribirse_pichanga',
            ],
            posiciones: ['Punta', 'Centro'],
            statAtaque: 6,
            statRecepcion: 5,
            statBloqueo: 4,
            statSaque: 6,
            statArmada: null,
        },
    })
    console.log(`  Viewer creado: ${viewer.email}`)

    // Jugadores de prueba
    for (const jugador of jugadoresData) {
        const created = await prisma.user.create({
            data: {
                ...jugador,
                password: PASSWORD,
                es_valido: true,
                aprobado_por_admin: true,
                permisos: ['ver_partidos', 'inscribirse_pichanga'],
            },
        })
        console.log(`  Jugador creado: ${created.nombre} (${created.email})`)
    }

    console.log('\nSeed completado.')
    console.log('Credenciales de prueba (contraseña: test1234):')
    console.log('  admin@test.com    — admin con todos los permisos')
    console.log('  viewer@test.com   — puede ver estadísticas, no editar')
    console.log('  carlos@test.com   — jugador regular')
    console.log('  (y 9 jugadores más en jugadores@test.com)')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
