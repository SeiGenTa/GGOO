import { mkdir } from 'node:fs'
import pino from 'pino'

const dirLogs = process.env.DIR_LOGS || './app.logs'

const transport = pino.transport({
    targets: [
        {
            target: 'pino/file',
            options: {
                colorize: true,
                translateTime: true,
                ignore: 'pid,hostname',
                destination: dirLogs,
                mkdir: true,
            },
        },
        {
            target: 'pino/file', // o 'pino-pretty' si estás en desarrollo local
            options: { destination: 1 }, // 1 significa stdout (la consola)
        },
    ],
})

const logger = pino(transport)

export default logger
