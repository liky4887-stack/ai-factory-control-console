// Classifies a failure from a prior phase and produces a repair plan.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export type FailureKind = 'auth' | 'rate-limit' | 'timeout' | 'parse' | 'network' | 'not-found' | 'unknown';

export interface HealOutput {
  kind: FailureKind;
  diagnosis: string;
  action: 'retry' | 'switch-engine' | 'refresh-credentials' | 'skip' | 'abort';
  suggestedEngine?: string;
}

function classify(err: string): FailureKind {
  const s = err.toLowerCase();
  if (s.includes('401') || s.includes('auth') || s.includes('unauthorized')) return 'auth';
  if (s.includes('429') || s.includes('rate') || s.includes('throttl')) return 'rate-limit';
  if (s.includes('timeout') || s.includes('aborted') || s.includes('etimedout')) return 'timeout';
  if (s.includes('json') || s.includes('parse') || s.includes('unexpected token')) return 'parse';
  if (s.includes('econnrefused') || s.includes('network') || s.includes('fetch failed')) return 'network';
  if (s.includes('404') || s.includes('not found')) return 'not-found';
  return 'unknown';
}

function diagnose(kind: FailureKind): { diagnosis: string; action: HealOutput['action'] } {
  switch (kind) {
    case 'auth':       return { diagnosis: 'Credentials rejected or expired.', action: 'refresh-credentials' };
    case 'rate-limit': return { diagnosis: 'Upstream is throttling.', action: 'switch-engine' };
    case 'timeout':    return { diagnosis: 'Request exceeded the timeout budget.', action: 'retry' };
    case 'parse':      return { diagnosis: 'Response was not valid JSON or was truncated.', action: 'retry' };
    case 'network':    return { diagnosis: 'Could not reach the gateway.', action: 'retry' };
    case 'not-found':  return { diagnosis: 'Target file or endpoint does not exist.', action: 'skip' };
    default:           return { diagnosis: 'Unclassified error.', action: 'abort' };
  }
}

export class HealEngine implements Engine<{ error: string }, HealOutput> {
  readonly id = 'heal';
  readonly label = 'Self-Heal';
  readonly phase = 'heal' as const;

  async run(input: { error: string }, ctx: EngineContext): Promise<EngineResult<HealOutput>> {
    return runWrapped(async () => {
      const kind = classify(input.error);
      const { diagnosis, action } = diagnose(kind);
      ctx.emit('Heal', 'heal', 'warn', 'Failure classified as ' + kind + ': ' + diagnosis, { action });

      let suggestedEngine: string | undefined;
      if (kind === 'timeout' || kind === 'rate-limit') suggestedEngine = 'engine_deepseek';

      return { kind, diagnosis, action, suggestedEngine };
    }, { softFailure: true });
  }
}
