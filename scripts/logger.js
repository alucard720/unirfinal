const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
  level: 'info', // niveles: error, warn, info, verbose, debug, silly
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat)
    }),
    new transports.File({ filename: 'pipeline.log', maxsize: 5 * 1024 * 1024, maxFiles: 5 })
  ]
});

module.exports = logger;
