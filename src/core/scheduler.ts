import { createLogger } from './logger';

const log = createLogger('scheduler');

export interface Task {
  id: string;
  name: string;
  priority: number;
  scheduledAt: number;
  handler: () => Promise<void>;
}

export class Scheduler {
  private queue: Task[] = [];
  private running = new Set<string>();

  add(task: Task): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    log.debug(`queued task ${task.id}`, { name: task.name, priority: task.priority });
  }

  remove(id: string): boolean {
    const idx = this.queue.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  async runNext(): Promise<boolean> {
    const task = this.queue.shift();
    if (!task) return false;

    if (this.running.has(task.id)) {
      log.warn(`task ${task.id} already running, skipping`);
      return false;
    }

    this.running.add(task.id);
    try {
      log.info(`running task ${task.id}`, { name: task.name });
      await task.handler();
      return true;
    } catch (err) {
      log.error(`task ${task.id} failed`, err);
      return false;
    } finally {
      this.running.delete(task.id);
    }
  }

  pending(): number {
    return this.queue.length;
  }

  isRunning(id: string): boolean {
    return this.running.has(id);
  }
}
