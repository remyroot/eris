import { LogLevel } from './types';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function emit(level: LogLevel, module: string, msg: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${module}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${msg}`, data);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) => emit('debug', module, msg, data),
    info: (msg: string, data?: unknown) => emit('info', module, msg, data),
    warn: (msg: string, data?: unknown) => emit('warn', module, msg, data),
    error: (msg: string, data?: unknown) => emit('error', module, msg, data),
  };
}
// exported for use in other modules
