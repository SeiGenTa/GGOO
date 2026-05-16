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
    ],
})

const logger = pino(transport)

export default logger
