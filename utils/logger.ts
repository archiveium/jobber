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
    format: format.json(),
    defaultMeta: { service: 'scheduler' },
    transports: [
      //
      // - Write all logs with importance level of `error` or less to `error.log`
      // - Write all logs with importance level of `info` or less to `combined.log`
      //
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' }),
    ],
  });
}

export const logger = winston;