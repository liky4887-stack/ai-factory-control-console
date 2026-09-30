// Single source of truth for every engine instance.
// The orchestrator queries this by phase id.

import type { Engine } from './Engine';
import type { PhaseId } from './PhaseRegistry';

export class EngineRegistry {
  private engines = new Map<PhaseId, Engine<any, any>>();

  register(engine: Engine<any, any>): void {
    if (this.engines.has(engine.phase)) {
      throw new Error('phase already registered: ' + engine.phase);
    }
    this.engines.set(engine.phase, engine);
  }

  get(phase: PhaseId): Engine<any, any> | undefined {
    return this.engines.get(phase);
  }

  has(phase: PhaseId): boolean {
    return this.engines.has(phase);
  }

  list(): Array<Engine<any, any>> {
    return Array.from(this.engines.values());
  }
}
