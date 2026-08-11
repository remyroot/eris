import { createLogger, setLogLevel } from './core/logger';
import { StateManager } from './core/state';

const log = createLogger('main');

async function main(): Promise<void> {
  log.info('eris starting');

  const logLevel = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
  setLogLevel(logLevel);

  const state = new StateManager();

  log.info('state initialized', { startedAt: state.getState().startedAt });

  // main loop will be added here
  log.info('eris ready');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
