import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectiveTracker } from '../src/objectives/tracker';

describe('ObjectiveTracker', () => {
  let tracker: ObjectiveTracker;

  beforeEach(() => {
    tracker = new ObjectiveTracker();
  });

  it('adds objectives', () => {
    tracker.add({
      name: 'Test',
      description: 'Test objective',
      category: 'Research',
      status: 'active',
      progress: 0,
      target: 10,
      triggers: ['ArXiv'],
    });
    expect(tracker.getAll().length).toBe(1);
  });

  it('tracks progress on tick', () => {
    tracker.add({
      name: 'Read papers',
      description: 'Read papers',
      category: 'Research',
      status: 'active',
      progress: 0,
      target: 100,
      triggers: ['ArXiv'],
    });

    const updates = tracker.tick('ArXiv');
    expect(updates.length).toBe(1);
    expect(updates[0].newProgress).toBeGreaterThan(0);
  });

  it('does not advance on wrong location', () => {
    tracker.add({
      name: 'Read papers',
      description: 'Read papers',
      category: 'Research',
      status: 'active',
      progress: 0,
      target: 100,
      triggers: ['ArXiv'],
    });

    const updates = tracker.tick('Minecraft');
    expect(updates.length).toBe(0);
  });

  it('completes objectives at target', () => {
    tracker.add({
      name: 'Quick task',
      description: 'Quick task',
      category: 'Research',
      status: 'active',
      progress: 98,
      target: 100,
      triggers: ['ArXiv'],
    });

    const updates = tracker.tick('ArXiv');
    const completed = updates.find(u => u.completed);
    expect(completed).toBeTruthy();
  });

  it('promotes queued objectives', () => {
    // Add 4 active (fill the slots)
    for (let i = 0; i < 4; i++) {
      tracker.add({
        name: `Active ${i}`,
        description: 'test',
        category: 'Research',
        status: 'active',
        progress: 0,
        target: 1000,
        triggers: ['Wikipedia'],
      });
    }

    // Complete one
    const all = tracker.getAll();
    all[0].status = 'complete';

    // Add a queued one
    tracker.add({
      name: 'Queued task',
      description: 'test',
      category: 'Research',
      status: 'queued',
      progress: 0,
      target: 100,
      triggers: ['ArXiv'],
    });

    tracker.tick('Desktop');
    const active = tracker.getByStatus('active');
    expect(active.length).toBeGreaterThanOrEqual(4);
  });
});
