import path from 'path'
import fs from 'fs'
import type { PageServerLoad } from './$types'

type contributiosFormat = {
    name: string
    image: string
    description: string
    detalle: string
    link: {
        icon: string
        url: string
    }[]
    buyme_a_coffee: {
        icon: string
        url: string
        text: string
    }[]
}

export const load: PageServerLoad = async () => {
    // Forzamos que busque en la raíz real del proyecto ejecutable
    const filePath = path.join(process.cwd(), 'contributors.json')

    // Como extra de seguridad, validamos que exista Y que no sea un directorio
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
        return {
            contributors: [] as contributiosFormat[],
        }
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8').trim()
    const contributors: contributiosFormat[] =
        fileContent.length > 0 ? JSON.parse(fileContent) : []

    return {
        contributors,
    }
}
