import { decrypt_json } from '$utils/encript'
import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from '../$types'
import type DataEncripted from './type'
import { ActionsDataEncripted } from './type'
import { prisma } from '$utils/prisma'
import { useId } from 'bits-ui'

export const load: PageServerLoad = ({ url }) => {
    const dataChangeNameEncripted = url.searchParams.get('data')
    if (!dataChangeNameEncripted || dataChangeNameEncripted == '') {
        redirect(303, '/app?error=Datos%20invalidos%20para%20cambiar%20nombre.')
    }

    let dataChangeName: DataEncripted
    try {
        dataChangeName = decrypt_json(dataChangeNameEncripted)
    } catch (error) {
        console.error('Error al desencriptar los datos:', error)
        redirect(303, '/app?error=Datos%20invalidos%20para%20cambiar%20nombre.')
    }
    if (!dataChangeName) {
        redirect(303, '/app?error=Datos%20invalidos%20para%20cambiar%20nombre.')
    }
    if (dataChangeName.action !== ActionsDataEncripted.ChangeName) {
        redirect(
            303,
            '/app?error=Accion%20no%20valida%20para%20cambiar%20nombre.'
        )
    }
    const userId = dataChangeName.id
    if (!userId) {
        redirect(
            303,
            '/app?error=ID%20de%20usuario%20no%20proporcionado%20para%20cambiar%20nombre.'
        )
    }

    const expirationTime = dataChangeName.max_age
        ? new Date(Date.now() + dataChangeName.max_age * 1000)
        : null
    if (expirationTime && expirationTime < new Date()) {
        redirect(
            303,
            '/app?error=El%20enlace%20para%20cambiar%20nombre%20ha%20expirado.'
        )
    }
    console.log(userId)

    return {
        userId,
    }
}

export const actions = {
    default: async ({ request, url }) => {
        const form = await request.formData()
        const new_name = form.get('new_name') as string
        const userId = form.get('userId') as string

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            aprobado_por_admin: true,
            rechazado_por_admin: true
          }
        })
        if (!user){
          redirect(301, "/auth?error=usuario%20no%20encontrado")
        }

        if(!user.rechazado_por_admin){
          redirect(301, "/auth?error=usuario%20no%20rechazado%20por%20admin")
        }

        await prisma.user.updateMany({
            where: { id: userId },
            data: {
                nombre: new_name,
                rechazado_por_admin: false,
            },
        })

        redirect(301, '/auth?success=Nombre%20cambiado%20correctamente.')
    },
} satisfies Actions
