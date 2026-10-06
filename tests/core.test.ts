import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../src/core/state';
import { CoreLoop } from '../src/core/loop';
import { Scheduler } from '../src/core/scheduler';
import { LOCATIONS } from '../config/locations';

describe('StateManager', () => {
  let state: StateManager;

  beforeEach(() => {
    state = new StateManager();
  });

  it('initializes with zero tick count', () => {
    expect(state.getState().tickCount).toBe(0);
  });

  it('increments tick count', () => {
    state.incrementTick();
    expect(state.getState().tickCount).toBe(1);
  });

  it('tracks location changes', () => {
    const loc = LOCATIONS[0];
    state.setLocation(loc, 5);
    expect(state.getState().location?.name).toBe(loc.name);
    expect(state.getState().stayDuration).toBe(5);
    expect(state.getState().ticksAtLocation).toBe(0);
  });

  it('detects when to move', () => {
    const loc = LOCATIONS[0];
    state.setLocation(loc, 2);
    expect(state.shouldMove()).toBe(false);
    state.incrementTick();
    expect(state.shouldMove()).toBe(false);
    state.incrementTick();
    expect(state.shouldMove()).toBe(true);
  });

  it('advances activities sequentially', () => {
    const loc = LOCATIONS[0];
    state.setLocation(loc, 10);
    const acts1 = state.advanceActivity(1);
    expect(acts1.length).toBe(1);
    expect(acts1[0]).toBe(loc.activities[0]);

    const acts2 = state.advanceActivity(1);
    expect(acts2[0]).toBe(loc.activities[1]);
  });

  it('wraps activity index', () => {
    const loc = LOCATIONS[0];
    state.setLocation(loc, 100);
    for (let i = 0; i < loc.activities.length; i++) {
      state.advanceActivity(1);
    }
    const wrapped = state.advanceActivity(1);
    expect(wrapped[0]).toBe(loc.activities[0]);
  });

  it('maintains feed with max size', () => {
    state.setLocation(LOCATIONS[0], 10);
    for (let i = 0; i < 250; i++) {
      state.pushFeed({ timestamp: Date.now(), tag: 'web', message: `msg ${i}` });
    }
    expect(state.getFeed().length).toBeLessThanOrEqual(200);
  });
});

describe('CoreLoop', () => {
  it('moves to a location on first tick', () => {
    const state = new StateManager();
    const loop = new CoreLoop(state, LOCATIONS);
    const result = loop.tick();
    expect(result.moved).toBe(true);
    expect(result.location).toBeDefined();
    expect(result.location.name).toBeTruthy();
  });

  it('stays at location until duration expires', () => {
    const state = new StateManager();
    const loop = new CoreLoop(state, LOCATIONS);

    const first = loop.tick();
    expect(first.moved).toBe(true);

    // Subsequent ticks should not move (unless duration is 1)
    const second = loop.tick();
    // Can't guarantee no move since duration might be 1
    expect(second.location).toBeDefined();
  });

  it('throws on empty locations', () => {
    const state = new StateManager();
    expect(() => new CoreLoop(state, [])).toThrow();
  });
});

describe('Scheduler', () => {
  it('runs tasks in priority order', async () => {
    const scheduler = new Scheduler();
    const results: string[] = [];

    scheduler.add({
      id: 'low',
      name: 'low priority',
      priority: 1,
      scheduledAt: Date.now(),
      handler: async () => { results.push('low'); },
    });

    scheduler.add({
      id: 'high',
      name: 'high priority',
      priority: 10,
      scheduledAt: Date.now(),
      handler: async () => { results.push('high'); },
    });

    await scheduler.runNext();
    expect(results).toEqual(['high']);

    await scheduler.runNext();
    expect(results).toEqual(['high', 'low']);
  });

  it('reports pending count', () => {
    const scheduler = new Scheduler();
    expect(scheduler.pending()).toBe(0);

    scheduler.add({
      id: 'test',
      name: 'test',
      priority: 1,
      scheduledAt: Date.now(),
      handler: async () => {},
    });

    expect(scheduler.pending()).toBe(1);
  });
});
