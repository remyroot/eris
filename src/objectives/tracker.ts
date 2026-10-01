import { Objective, ObjectiveStatus, ObjectiveUpdate } from './types';
import { createLogger } from '../core/logger';
import { uid, randInt } from '../core/utils';

const log = createLogger('objectives:tracker');

const MAX_ACTIVE = 4;

export class ObjectiveTracker {
  private objectives: Objective[] = [];

  load(objectives: Objective[]): void {
    this.objectives = objectives;
    log.info(`loaded ${objectives.length} objectives`);
  }

  getAll(): Objective[] {
    return [...this.objectives];
  }

  getByStatus(status: ObjectiveStatus): Objective[] {
    return this.objectives.filter(o => o.status === status);
  }

  getById(id: string): Objective | undefined {
    return this.objectives.find(o => o.id === id);
  }

  add(objective: Omit<Objective, 'id' | 'createdAt' | 'completedAt'>): Objective {
    const obj: Objective = {
      ...objective,
      id: uid(),
      createdAt: Date.now(),
      completedAt: null,
    };
    this.objectives.push(obj);
    log.info(`added objective: ${obj.name} (${obj.status})`);
    return obj;
  }

  // Update progress based on current location
  tick(locationName: string): ObjectiveUpdate[] {
    const updates: ObjectiveUpdate[] = [];

    for (const obj of this.objectives) {
      if (obj.status !== 'active') continue;

      const triggered = obj.triggers.some(t => locationName.startsWith(t));
      if (!triggered) continue;

      const prev = obj.progress;
      obj.progress = this.advanceProgress(obj, locationName);

      if (obj.progress !== prev) {
        const completed = obj.progress >= obj.target;
        if (completed) {
          obj.status = 'complete';
          obj.completedAt = Date.now();
          log.info(`objective completed: ${obj.name}`);
        }

        updates.push({
          objectiveId: obj.id,
          previousProgress: prev,
          newProgress: obj.progress,
          completed,
        });
      }
    }

    // Promote queued objectives if slots available
    this.promote(locationName);

    return updates;
  }

  private advanceProgress(obj: Objective, location: string): number {
    // Progress rate depends on objective type
    switch (obj.category.toLowerCase()) {
      case 'research':
        return Math.min(obj.target, obj.progress + randInt(1, 3));
      case 'games':
        return Math.min(obj.target, obj.progress + randInt(1, 5));
      case 'infrastructure':
        return Math.min(obj.target, obj.progress + randInt(1, 2));
      default:
        return Math.min(obj.target, obj.progress + 1);
    }
  }

  private promote(locationName: string): void {
    let activeCount = this.objectives.filter(o => o.status === 'active').length;

    // Priority: promote queued objectives triggered by current location
    for (const obj of this.objectives) {
      if (obj.status !== 'queued') continue;
      if (activeCount >= MAX_ACTIVE + 1) break;

      const triggered = obj.triggers.some(t => locationName.startsWith(t));
      if (triggered) {
        obj.status = 'active';
        activeCount++;
        log.info(`promoted objective (triggered): ${obj.name}`);
      }
    }

    // Fill remaining slots
    for (const obj of this.objectives) {
      if (obj.status !== 'queued') continue;
      if (activeCount >= MAX_ACTIVE) break;
      obj.status = 'active';
      activeCount++;
      log.info(`promoted objective: ${obj.name}`);
    }
  }

  serialize(): Objective[] {
    return this.objectives;
  }
}

// fixed: prevent double-promotion when both trigger and slot-fill match
