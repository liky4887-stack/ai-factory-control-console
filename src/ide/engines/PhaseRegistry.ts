// Every capability in the IDE is a phase in the pipeline.
// The orchestrator reads this registry to build the DAG and to decide
// which phases apply to a given request.

import type { ActivityPhase, ActivitySource } from '../core/types';

export type PhaseId =
  | 'understand' | 'plan' | 'audit' | 'market' | 'adapt'
  | 'skills'
  | 'generate' | 'diff' | 'simulate' | 'deploy' | 'heal'
  | 'meta' | 'evolve';

/** Why a phase runs. The orchestrator picks phases by matching intent. */
export type PhaseTrigger =
  | 'always'         // runs on every request
  | 'code-change'    // runs when the request modifies files
  | 'deploy-request' // runs when the user asks to deploy
  | 'error'          // runs only if a prior phase failed
  | 'ui-ux'          // runs only when the request touches UI/UX
  | 'scheduled';     // runs on a cadence (every Nth task)

export interface PhaseSpec {
  id: PhaseId;
  /** Short uppercase label for the state strip. */
  shortLabel: string;
  /** Full sentence for the Glass Box. */
  label: string;
  /** Which activity source events from this phase carry. */
  source: ActivitySource;
  trigger: PhaseTrigger;
  /** Lower runs first. */
  order: number;
  /** Skip without failing the pipeline if this phase throws. */
  optional: boolean;
}

export const PHASES: PhaseSpec[] = [
  { id: 'understand', shortLabel: 'UNDERSTAND', label: 'Understand request',   source: 'Planning',   trigger: 'always',         order: 10,  optional: false },
  { id: 'plan',       shortLabel: 'PLAN',       label: 'Draft plan',           source: 'Planning',   trigger: 'always',         order: 20,  optional: false },
  { id: 'audit',      shortLabel: 'AUDIT',      label: 'Audit impact',         source: 'Audit',      trigger: 'code-change',    order: 30,  optional: true  },
  { id: 'market',     shortLabel: 'MARKET',     label: 'Market check',         source: 'Market',     trigger: 'code-change',    order: 40,  optional: true  },
  { id: 'adapt',      shortLabel: 'ADAPT',      label: 'Adapt to profile',     source: 'Meta',       trigger: 'code-change',    order: 50,  optional: true  },
  { id: 'skills',     shortLabel: 'SKILLS',     label: 'Load skills',          source: 'Meta',       trigger: 'ui-ux',          order: 55,  optional: true  },
  { id: 'generate',   shortLabel: 'GENERATE',   label: 'Produce output',       source: 'CodeGen',    trigger: 'always',         order: 60,  optional: false },
  { id: 'diff',       shortLabel: 'DIFF',       label: 'Compute diff',         source: 'Diff',       trigger: 'code-change',    order: 70,  optional: true  },
  { id: 'simulate',   shortLabel: 'SIMULATE',   label: 'Simulate',             source: 'Simulation', trigger: 'deploy-request', order: 80,  optional: true  },
  { id: 'deploy',     shortLabel: 'DEPLOY',     label: 'Deploy',               source: 'Deploy',     trigger: 'deploy-request', order: 90,  optional: true  },
  { id: 'heal',       shortLabel: 'HEAL',       label: 'Self-heal',            source: 'Heal',       trigger: 'error',          order: 100, optional: true  },
  { id: 'meta',       shortLabel: 'META',       label: 'Record outcome',       source: 'Meta',       trigger: 'always',         order: 110, optional: true  },
  { id: 'evolve',     shortLabel: 'EVOLVE',     label: 'Evolution check',      source: 'Evolution',  trigger: 'scheduled',      order: 120, optional: true  },
];

export function phaseSpec(id: PhaseId): PhaseSpec {
  const s = PHASES.find((p) => p.id === id);
  if (!s) throw new Error('unknown phase: ' + id);
  return s;
}

/** Which phases apply to a given intent. */
export function phasesForIntent(opts: {
  isCodeChange: boolean;
  isDeployRequest: boolean;
  hadError: boolean;
  isScheduledTick: boolean;
  isUiUx?: boolean;
}): PhaseId[] {
  const out: PhaseId[] = [];
  for (const p of PHASES) {
    const match =
      p.trigger === 'always' ||
      (p.trigger === 'code-change' && opts.isCodeChange) ||
      (p.trigger === 'deploy-request' && opts.isDeployRequest) ||
      (p.trigger === 'error' && opts.hadError) ||
      (p.trigger === 'ui-ux' && opts.isUiUx === true) ||
      (p.trigger === 'scheduled' && opts.isScheduledTick);
    if (match) out.push(p.id);
  }
  return out;
}
