import c from 'picocolors'

type LogFunction = (message: string) => void
type ColorFunction = (message: string) => string

interface Logger {
  success: LogFunction
  info: LogFunction
  error: LogFunction
  warn: LogFunction
  log: LogFunction
}

const createLoggerMethod =
  (colorFn: ColorFunction, symbol: string): LogFunction =>
  (message: string) =>
    console.log(`${colorFn(symbol)} ${colorFn(message)}`)

const logger: Logger = {
  success: createLoggerMethod(c.green, '✔'),
  info: createLoggerMethod(c.blue, 'ℹ'),
  error: createLoggerMethod(c.red, '✖'),
  warn: createLoggerMethod(c.yellow, '⚠'),
  log: console.log,
}

export default logger
