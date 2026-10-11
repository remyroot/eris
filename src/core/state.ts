import { AgentState, Location, FeedEntry } from './types';
import { createLogger } from './logger';

const log = createLogger('state');

const MAX_FEED = 200;

export class StateManager {
  private state: AgentState;
  private feed: FeedEntry[] = [];
  private metrics = {
    actions: 0,
    pagesVisited: 0,
    dataStored: 0,
  };

  constructor() {
    this.state = {
      location: null,
      tickCount: 0,
      ticksAtLocation: 0,
      stayDuration: 0,
      activityIndex: 0,
      startedAt: Date.now(),
      lastTickAt: Date.now(),
    };
  }

  getState(): Readonly<AgentState> {
    return this.state;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getFeed(limit?: number): FeedEntry[] {
    return this.feed.slice(0, limit || MAX_FEED);
  }

  incrementTick(): void {
    this.state.tickCount++;
    this.state.ticksAtLocation++;
    this.state.lastTickAt = Date.now();
  }

  setLocation(location: Location, stayDuration: number): void {
    log.info(`moving to ${location.name}`, { type: location.type, stay: stayDuration });
    this.state.location = location;
    this.state.ticksAtLocation = 0;
    this.state.stayDuration = stayDuration;
    this.state.activityIndex = 0;
    this.metrics.pagesVisited++;

    this.pushFeed({
      timestamp: Date.now(),
      tag: location.type,
      message: `Navigated to ${location.name}`,
    });
  }

  advanceActivity(count: number): string[] {
    if (!this.state.location) return [];
    const acts = this.state.location.activities;
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = this.state.activityIndex % acts.length;
      result.push(acts[idx]);
      this.state.activityIndex++;
    }
    return result;
  }

  pushFeed(entry: FeedEntry): void {
    this.feed.unshift(entry);
    if (this.feed.length > MAX_FEED) {
      this.feed.length = MAX_FEED;
    }
    this.metrics.actions++;
  }

  shouldMove(): boolean {
    return this.state.ticksAtLocation >= this.state.stayDuration;
  }

  serialize(): object {
    return {
      state: this.state,
      feed: this.feed.slice(0, 60),
      metrics: this.metrics,
    };
  }
}
// Increase to 300 max feed entries for longer history
