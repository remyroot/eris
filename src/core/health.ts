import { StateManager } from './state';
import { ObjectiveTracker } from '../objectives/tracker';

export interface HealthStatus {
  status: 'running' | 'stopped';
  uptime: number;
  tickCount: number;
  location: string | null;
  activeObjectives: number;
  corpusSize: number;
}

export function getHealth(
  state: StateManager,
  objectives: ObjectiveTracker,
  corpusSize: number,
): HealthStatus {
  const s = state.getState();
  return {
    status: 'running',
    uptime: Date.now() - s.startedAt,
    tickCount: s.tickCount,
    location: s.location?.name || null,
    activeObjectives: objectives.getByStatus('active').length,
    corpusSize,
  };
}
