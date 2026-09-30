// SkillsEngine — matches the user's prompt against the bundled skill
// library and, when there's a hit AND the prompt touches UI/UX,
// returns a reference-skills block that later phases prepend to their
// model calls.
//
// Skips entirely when the prompt is not UI/UX-related. This is the
// contract: no overhead, no noise for non-visual work.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';
import { detectUiUxIntent } from '../../core/uiUxIntent';
import { matchSkills, buildSkillBlock } from '../../skills/matcher';
import type { MatchedSkill } from '../../skills/types';

export interface SkillsInput {
  prompt: string;
}

export interface SkillsOutput {
  /** Was the request classified as UI/UX? */
  isUiUx: boolean;
  /** Why it was classified that way. */
  intentReasons: string[];
  /** Which skills were selected (0 if none matched). */
  matches: MatchedSkill[];
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

      // The phase fires when EITHER UI/UX OR video intent is present.
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

      const matches = matchSkills(input.prompt);
      if (matches.length === 0) {
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

      const block = buildSkillBlock(matches);
      const names = matches.map((m) => m.skill.id).join(', ');

      ctx.emit('Meta', 'skills', 'success',
        'Loaded ' + matches.length + ' skill' + (matches.length === 1 ? '' : 's') + ': ' + names,
        {
          skills: matches.map((m) => ({ id: m.skill.id, score: m.score, on: m.matchedOn })),
          bytes: block.length,
        },
      );

      return {
        isUiUx: true,
        intentReasons: intent.reasons,
        matches,
        block,
        bytes: block.length,
      };
    }, { softFailure: true });
  }
}
