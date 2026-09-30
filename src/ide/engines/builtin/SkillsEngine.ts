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
import { SKILL_BUNDLE } from '../../skills/bundle';
import { WEBSITE_BUILD } from '../../skills/composites';

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

// Broader than UI/UX signal: "build a website" loads the full
// website-build composite instead of top-3 matched skills.
const WEBSITE_BUILD_RE = /\b(build|create|make|scaffold|design|redesign|launch)\b[\s\S]{0,60}\b(website|web ?site|web ?app|webapp|landing page|homepage|home page|marketing site|portfolio|saas site|blog)\b|\b(website|web ?site|web ?app|webapp|landing page|homepage|home page)\b/i;

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

      const isWebsiteBuild = WEBSITE_BUILD_RE.test(input.prompt);

      let matches: MatchedSkill[];
      let block: string;

      if (isWebsiteBuild) {
        const composite = WEBSITE_BUILD;
        matches = composite.skillIds
          .map((id) => SKILL_BUNDLE.find((s) => s.id === id))
          .filter((s): s is (typeof SKILL_BUNDLE)[number] => !!s)
          .map((skill) => ({ skill, score: 0, matchedOn: ['composite:' + composite.id] }));

        block = buildSkillBlock(matches, {
          perSkillCap: composite.perSkillCap,
          totalCap: composite.totalCap,
        });

        ctx.emit('Meta', 'skills', 'success',
          'Website build composite loaded — ' + matches.length + ' skills combined',
          {
            composite: composite.id,
            skills: matches.map((m) => m.skill.id),
            bytes: block.length,
          },
        );
      } else {
        matches = matchSkills(input.prompt);
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

        block = buildSkillBlock(matches);
        const names = matches.map((m) => m.skill.id).join(', ');

        ctx.emit('Meta', 'skills', 'success',
          'Loaded ' + matches.length + ' skill' + (matches.length === 1 ? '' : 's') + ': ' + names,
          {
            skills: matches.map((m) => ({ id: m.skill.id, score: m.score, on: m.matchedOn })),
            bytes: block.length,
          },
        );
      }

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
