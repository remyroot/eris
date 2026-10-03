import { StateManager } from './state';
import { CoreLoop } from './loop';
import { ObjectiveTracker } from '../objectives/tracker';
import { CorpusManager } from '../memory/corpus';
import { createLogger } from './logger';
import { Location } from './types';

const log = createLogger('orchestrator');

// Orchestrator ties together all subsystems
// Manages the lifecycle of a single agent tick

export interface TickContext {
  location: Location;
  moved: boolean;
  objectives: ReturnType<ObjectiveTracker['getAll']>;
  corpusStats: ReturnType<CorpusManager['stats']>;
}

export class Orchestrator {
  private state: StateManager;
  private loop: CoreLoop;
  private objectives: ObjectiveTracker;
  private corpus: CorpusManager;
  private tickCount = 0;

  constructor(deps: {
    state: StateManager;
    loop: CoreLoop;
    objectives: ObjectiveTracker;
    corpus: CorpusManager;
  }) {
    this.state = deps.state;
    this.loop = deps.loop;
    this.objectives = deps.objectives;
    this.corpus = deps.corpus;
  }

  async executeTick(): Promise<TickContext> {
    this.tickCount++;
    const result = this.loop.tick();

    // Update objectives
    const updates = this.objectives.tick(result.location.name);
    for (const update of updates) {
      if (update.completed) {
        log.info(`objective completed during tick ${this.tickCount}`);
      }
    }

    const context: TickContext = {
      location: result.location,
      moved: result.moved,
      objectives: this.objectives.getAll(),
      corpusStats: this.corpus.stats(),
    };

    if (this.tickCount % 10 === 0) {
      log.info('periodic status', {
        tick: this.tickCount,
        location: result.location.name,
        corpus: context.corpusStats,
        activeObjectives: context.objectives.filter(o => o.status === 'active').length,
      });
    }

    return context;
  }

  getTickCount(): number {
    return this.tickCount;
  }
}
