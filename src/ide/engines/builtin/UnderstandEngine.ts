// Restates the user request in one sentence so downstream phases have
// a canonical interpretation to reason against.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface UnderstandOutput { restatement: string; engineId: string; engineLabel: string }

export class UnderstandEngine implements Engine<{ prompt: string; systemContext?: string }, UnderstandOutput> {
  readonly id = 'understand';
  readonly label = 'Understand';
  readonly phase = 'understand' as const;

  async run(
    input: { prompt: string; systemContext?: string },
    ctx: EngineContext,
  ): Promise<EngineResult<UnderstandOutput>> {
    return runWrapped(async () => {
      const userContent =
        'Restate the following request in one sentence, in the form ' +
        '"The user wants X." No other text.\n\nREQUEST:\n' + input.prompt;

      const composed = input.systemContext
        ? input.systemContext + '\n\n=== USER REQUEST ===\n' + userContent
        : userContent;

      const resp = await ctx.callModel([{ role: 'user', content: composed }]);

      ctx.emit('Planning', 'understand', 'success', 'Understood: ' + resp.content.slice(0, 120), {
        engineId: resp.engineId,
      });

      return { restatement: resp.content, engineId: resp.engineId, engineLabel: resp.engineLabel };
    });
  }
}
