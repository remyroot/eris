import { StateManager } from './state';
import { Location, TickResult } from './types';
import { createLogger } from './logger';
import { randInt, pickRandom } from './utils';

const log = createLogger('loop');

export class CoreLoop {
  private state: StateManager;
  private locations: Location[];
  private running = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(state: StateManager, locations: Location[]) {
    this.state = state;
    this.locations = locations;

    if (locations.length === 0) {
      throw new Error('CoreLoop: no locations provided');
    }
  }

  tick(): TickResult {
    this.state.incrementTick();
    const s = this.state.getState();

    let location = s.location;
    let moved = false;

    if (!location || this.state.shouldMove()) {
      location = pickRandom(this.locations);
      const stay = randInt(location.stayRange[0], location.stayRange[1]);
      this.state.setLocation(location, stay);
      moved = true;
    }

    const numActs = randInt(1, 2);
    const activities = this.state.advanceActivity(numActs);

    for (const act of activities) {
      this.state.pushFeed({
        timestamp: Date.now(),
        tag: location.type,
        message: act,
      });
    }

    return { moved, location, activities, duration: s.ticksAtLocation };
  }

  start(intervalMs: number = 60_000): void {
    if (this.running) return;
    this.running = true;
    log.info(`tick loop started, interval=${intervalMs}ms`);

    this.tick();

    this.tickInterval = setInterval(() => {
      try {
        this.tick();
      } catch (err) {
        log.error('tick failed', err);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.running = false;
    log.info('loop stopped');
  }

  isRunning(): boolean {
    return this.running;
  }
}
