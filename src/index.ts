import { createLogger, setLogLevel } from './core/logger';
import { StateManager } from './core/state';
import { CoreLoop } from './core/loop';
import { LOCATIONS } from '../config/locations';

const log = createLogger('main');

const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL || '60000', 10);

async function main(): Promise<void> {
  const logLevel = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
  setLogLevel(logLevel);

  log.info('eris starting');

  const state = new StateManager();
  const loop = new CoreLoop(state, LOCATIONS);

  // Graceful shutdown
  const shutdown = () => {
    log.info('shutting down');
    loop.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  loop.start(TICK_INTERVAL);
  log.info(`running, tick interval ${TICK_INTERVAL}ms`);
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
