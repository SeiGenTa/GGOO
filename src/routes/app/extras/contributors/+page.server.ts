import path from 'path'
import fs from 'fs'
import type { PageServerLoad } from './$types'

type contributiosFormat = {
    name: string;
    image: string;
    description: string;
    link: {
        icon: string;
        url: string;
    }[];
    buyme_a_coffee: {
        icon: string;
        url: string;
        text: string;
    }[];
}

export const load: PageServerLoad = async () => {
    const filePath = path.resolve('constributions.json')
    if (!fs.existsSync(filePath)) {
        return {
            contributors: [] as contributiosFormat[],
        }
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8').trim()
    const contributors: contributiosFormat[] = fileContent.length > 0
        ? JSON.parse(fileContent)
        : []

    return {
        contributors,
    }
}
