// Produces the final answer. Feeds the restatement + plan + audit
// result forward so the model has full context.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface GenerateOutput {
  content: string;
  engineId: string;
  engineLabel: string;
  fellBack: boolean;
}

export class GenerateEngine implements Engine<{
  prompt: string;
  systemContext?: string;
  restatement?: string;
  plan?: string;
  auditSummary?: string;
}, GenerateOutput> {
  readonly id = 'generate';
  readonly label = 'Generate';
  readonly phase = 'generate' as const;

  async run(
    input: {
      prompt: string;
      systemContext?: string;
      restatement?: string;
      plan?: string;
      auditSummary?: string;
    },
    ctx: EngineContext,
  ): Promise<EngineResult<GenerateOutput>> {
    return runWrapped(async () => {
      const parts: string[] = [];
      parts.push('Produce the final answer for this request. Be concise.');
      parts.push('');
      parts.push('REQUEST:\n' + input.prompt);
      if (input.restatement) parts.push('\nRESTATEMENT:\n' + input.restatement);
      if (input.plan) parts.push('\nFOLLOW THIS PLAN:\n' + input.plan);
      if (input.auditSummary) parts.push('\nPROJECT CONTEXT (audit):\n' + input.auditSummary);

      const userContent = parts.join('\n');
      const composed = input.systemContext
        ? input.systemContext + '\n\n=== USER REQUEST ===\n' + userContent
        : userContent;

      const resp = await ctx.callModel([{ role: 'user', content: composed }]);

      ctx.emit('CodeGen', 'generate', 'success', 'Output (' + resp.content.length + ' chars)', {
        engineId: resp.engineId,
      });

      return {
        content: resp.content,
        engineId: resp.engineId,
        engineLabel: resp.engineLabel,
        fellBack: false,
      };
    });
  }
}
