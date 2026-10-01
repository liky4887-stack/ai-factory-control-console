// SkillsEngine — matches the user's prompt against the bundled skill
// library and, when there's a hit AND the prompt touches UI/UX or video,
// returns a reference-skills block that later phases prepend to their
// model calls.
//
// The actual selection logic lives in skills/loadBlock.ts so the same
// helper can serve both this chat-mode engine and the build path in
// UnifiedProjectScreen. This file only handles event emission.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';
import { detectUiUxIntent } from '../../core/uiUxIntent';
import { loadBuildBlock, type BuildBlockResult } from '../../skills/loadBlock';

export interface SkillsInput {
  prompt: string;
}

export interface SkillsOutput {
  /** Was the request classified as UI/UX? */
  isUiUx: boolean;
  /** Why it was classified that way. */
  intentReasons: string[];
  /** Which skills were selected (0 if none matched). */
  matches: Array<{ id: string; score: number; matchedOn: string[] }>;
  /** The pre-formatted prompt block to prepend. Empty when no matches. */
  block: string;
  /** Total bytes of skill content injected. */
  bytes: number;
}

export class SkillsEngine implements Engine<SkillsInput, SkillsOutput> {
  readonly id = 'skills';
  readonly label = 'Skills';
  readonly phase = 'skills' as const;

  shouldRun(_input: SkillsInput, _ctx: EngineContext): boolean {
    return true;   // we self-skip inside run()
  }

  async run(input: SkillsInput, ctx: EngineContext): Promise<EngineResult<SkillsOutput>> {
    return runWrapped(async () => {
      const intent = detectUiUxIntent(input.prompt);

      if (!intent.isUiUx && !intent.isVideo) {
        ctx.emit('Meta', 'skills', 'info', 'Non-UI/UX, non-video request — skills skipped', {
          reasons: intent.reasons,
        });
        return {
          isUiUx: false,
          intentReasons: [],
          matches: [],
          block: '',
          bytes: 0,
        };
      }

      const domainLabel = intent.preferredDomain === 'media' ? 'video'
        : intent.preferredDomain === 'ui-ux' ? 'UI/UX'
        : 'UI/UX + video';

      ctx.emit('Meta', 'skills', 'info',
        domainLabel + ' intent detected (' + intent.reasons.join(', ') + ') — matching skills...',
        { matchedWords: intent.matchedWords, preferredDomain: intent.preferredDomain },
      );

      const result: BuildBlockResult | null = loadBuildBlock(input.prompt);

      if (!result) {
        ctx.emit('Meta', 'skills', 'warn', 'No skill matched the request', {
          prompt: input.prompt.slice(0, 80),
        });
        return {
          isUiUx: true,
          intentReasons: intent.reasons,
          matches: [],
          block: '',
          bytes: 0,
        };
      }

      if (result.isComposite) {
        ctx.emit('Meta', 'skills', 'success',
          'Website build composite loaded — ' + result.skillIds.length + ' skills combined',
          {
            composite: 'website-build',
            skills: result.skillIds,
            bytes: result.bytes,
          },
        );
      } else {
        const names = result.skillIds.join(', ');
        ctx.emit('Meta', 'skills', 'success',
          'Loaded ' + result.skillIds.length + ' skill' +
          (result.skillIds.length === 1 ? '' : 's') + ': ' + names,
          {
            skills: result.skillIds,
            bytes: result.bytes,
          },
        );
      }

      // Preserve the marker the quality gate depends on. QualityEngine
      // reads matchedOn and looks for 'composite:website-build'.
      const matchedOn = result.isComposite ? ['composite:website-build'] : [];
      return {
        isUiUx: true,
        intentReasons: intent.reasons,
        matches: result.skillIds.map((id) => ({ id, score: 0, matchedOn })),
        block: result.block,
        bytes: result.bytes,
      };
    }, { softFailure: true });
  }
}
