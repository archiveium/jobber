import { format, createLogger, transports, Logger } from 'winston';

let winston: Logger;

// If we're not in production then log to the `console`
if (process.env.NODE_ENV === 'development') {
    winston = createLogger({
        level: 'info',
        defaultMeta: { service: 'scheduler' },
        transports: [
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.timestamp({
                        format: 'YY-MM-DD HH:mm:ss',
                    }),
                    format.printf(
                        info => `${info.timestamp} ${info.level}: ${info.message}`
                    ),
                ),
            }),
        ],
    });
} else {
    winston = createLogger({
        level: 'info',
        defaultMeta: { service: 'scheduler' },
        transports: [
            new transports.File({
                filename: 'error.log',
                dirname: 'logs',
                level: 'error',
                format: format.combine(
                    format.timestamp({
                        format: 'YY-MM-DD HH:mm:ss',
                    }),
                    format.printf(
                        info => `${info.timestamp} ${info.level}: ${info.message}`
                    ),
                ),
            }),
            new transports.File({
                filename: 'combined.log',
                dirname: 'logs',
                format: format.combine(
                    format.timestamp({
                        format: 'YY-MM-DD HH:mm:ss',
                    }),
                    format.printf(
                        info => `${info.timestamp} ${info.level}: ${info.message}`
                    ),
                ),
            }),
        ],
    });
}

export const logger = winston;