// Produces a short numbered plan for the request. Downstream generate
// and audit phases consume the plan.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface PlanOutput { plan: string; engineId: string; engineLabel: string }

export class PlanEngine implements Engine<{ prompt: string; systemContext?: string }, PlanOutput> {
  readonly id = 'plan';
  readonly label = 'Plan';
  readonly phase = 'plan' as const;

  async run(
    input: { prompt: string; systemContext?: string },
    ctx: EngineContext,
  ): Promise<EngineResult<PlanOutput>> {
    return runWrapped(async () => {
      const userContent =
        'Create a numbered plan (max 6 steps, short one-line steps) to fulfil ' +
        'this request. No preamble, no code.\n\nREQUEST:\n' + input.prompt;

      const composed = input.systemContext
        ? input.systemContext + '\n\n=== USER REQUEST ===\n' + userContent
        : userContent;

      const resp = await ctx.callModel([{ role: 'user', content: composed }]);

      ctx.emit('Planning', 'plan', 'success', 'Plan ready (' + resp.content.length + ' chars)', {
        engineId: resp.engineId,
      });

      return { plan: resp.content, engineId: resp.engineId, engineLabel: resp.engineLabel };
    });
  }
}
