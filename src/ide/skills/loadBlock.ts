// Extracts the skill block that should be sent to the backend on a build.
// One pure function, no side effects, no ActivityLog calls.
//
// SkillsEngine (chat path) and UnifiedProjectScreen (build path) both
// call this, so the skills the model sees are identical in both modes.

import { detectUiUxIntent } from '../core/uiUxIntent';
import { matchSkills, buildSkillBlock } from './matcher';
import type { MatchedSkill } from './types';
import { SKILL_BUNDLE } from './bundle';
import { WEBSITE_BUILD } from './composites';

// Broader than the UI/UX signal: "build a website" loads the full
// website-build composite instead of top-3 matched skills.
export const WEBSITE_BUILD_RE = /\b(build|create|make|scaffold|design|redesign|launch)\b[\s\S]{0,60}\b(website|web ?site|web ?app|webapp|landing page|homepage|home page|marketing site|portfolio|saas site|blog)\b|\b(website|web ?site|web ?app|webapp|landing page|homepage|home page)\b/i;

export interface BuildBlockResult {
  /** Ready-to-inject prompt block. */
  block: string;
  /** Which skill ids ended up in the block. */
  skillIds: string[];
  /** Byte length of block. */
  bytes: number;
  /** True if the composite loaded instead of top-3 matcher picks. */
  isComposite: boolean;
  /** Which domain was detected. */
  domain: 'ui-ux' | 'media' | 'either';
}

/**
 * Load the skill block for a prompt. Returns null when the prompt has
 * no UI/UX or video intent, or when nothing matched.
 */
export function loadBuildBlock(prompt: string): BuildBlockResult | null {
  const intent = detectUiUxIntent(prompt);
  if (!intent.isUiUx && !intent.isVideo) return null;

  if (WEBSITE_BUILD_RE.test(prompt)) {
    const matches: MatchedSkill[] = WEBSITE_BUILD.skillIds
      .map((id) => SKILL_BUNDLE.find((s) => s.id === id))
      .filter((s): s is (typeof SKILL_BUNDLE)[number] => !!s)
      .map((skill) => ({ skill, score: 0, matchedOn: ['composite:' + WEBSITE_BUILD.id] }));

    const block = buildSkillBlock(matches, {
      perSkillCap: WEBSITE_BUILD.perSkillCap,
      totalCap: WEBSITE_BUILD.totalCap,
    });

    return {
      block,
      skillIds: matches.map((m) => m.skill.id),
      bytes: block.length,
      isComposite: true,
      domain: intent.preferredDomain,
    };
  }

  const matches = matchSkills(prompt);
  if (matches.length === 0) return null;

  const block = buildSkillBlock(matches);
  return {
    block,
    skillIds: matches.map((m) => m.skill.id),
    bytes: block.length,
    isComposite: false,
    domain: intent.preferredDomain,
  };
}
