import { StateManager } from './state';
import { Location, TickResult } from './types';
import { createLogger } from './logger';

const log = createLogger('loop');

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class CoreLoop {
  private state: StateManager;
  private locations: Location[];
  private running = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(state: StateManager, locations: Location[]) {
    this.state = state;
    this.locations = locations;
  }

  tick(): TickResult {
    this.state.incrementTick();
    const s = this.state.getState();

    let location = s.location;
    let moved = false;

    // Move to a new location if stay duration expired or first tick
    if (!location || this.state.shouldMove()) {
      location = pickRandom(this.locations);
      const stay = randInt(location.stayRange[0], location.stayRange[1]);
      this.state.setLocation(location, stay);
      moved = true;
    }

    // Generate activities
    const numActs = randInt(1, 2);
    const activities = this.state.advanceActivity(numActs);

    for (const act of activities) {
      this.state.pushFeed({
        timestamp: Date.now(),
        tag: location.type,
        message: act,
      });
    }

    return {
      moved,
      location,
      activities,
      duration: s.ticksAtLocation,
    };
  }

  start(intervalMs: number = 60_000): void {
    if (this.running) return;
    this.running = true;
    log.info(`starting tick loop, interval=${intervalMs}ms`);

    // Run first tick immediately
    this.tick();

    this.tickInterval = setInterval(() => {
      try {
        const result = this.tick();
        log.debug('tick', {
          location: result.location.name,
          moved: result.moved,
          activities: result.activities.length,
        });
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
