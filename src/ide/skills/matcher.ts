// Scores each skill in the bundle against a prompt. Returns the top
// matches. Simple TF-style overlap — good enough for 7 skills, and
// cheap enough to run on every UI/UX request.

import { SKILL_BUNDLE } from './bundle';
import type { Skill, MatchedSkill } from './types';

const MIN_SCORE = 1;
const MAX_MATCHES = 3;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 32);
}

function scoreSkill(skill: Skill, promptTokens: Set<string>): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = [];

  // Tag overlap (heavy weight — tags are hand-curated)
  for (const tag of skill.tags) {
    if (promptTokens.has(tag.toLowerCase())) {
      score += 3;
      matchedOn.push(tag);
    }
  }

  // Description word overlap (light weight)
  for (const w of tokenize(skill.description)) {
    if (promptTokens.has(w)) {
      score += 1;
      if (!matchedOn.includes(w)) matchedOn.push(w);
    }
  }

  // Exact skill label reference is a strong signal
  if (promptTokens.has(skill.id.toLowerCase())) {
    score += 10;
    matchedOn.push('#' + skill.id);
  }

  return { score, matchedOn: matchedOn.slice(0, 8) };
}

export function matchSkills(prompt: string): MatchedSkill[] {
  const tokens = new Set(tokenize(prompt));
  const scored: MatchedSkill[] = [];

  for (const skill of SKILL_BUNDLE) {
    const { score, matchedOn } = scoreSkill(skill, tokens);
    if (score >= MIN_SCORE) scored.push({ skill, score, matchedOn });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_MATCHES);
}

/** Build the prompt block that gets injected into the model call. */
export function buildSkillBlock(matches: MatchedSkill[]): string {
  if (matches.length === 0) return '';
  const parts: string[] = [];
  parts.push('=== REFERENCE SKILLS (REQUIRED) ===');
  parts.push('These are not suggestions. Apply every pattern below when');
  parts.push('writing or reviewing UI code for this request.');
  parts.push('');
  for (const m of matches) {
    parts.push('### SKILL: ' + m.skill.label + ' (id: ' + m.skill.id + ')');
    parts.push('source: ' + m.skill.source);
    if (m.skill.referenceFiles.length > 0) {
      parts.push('references available: ' + m.skill.referenceFiles.join(', '));
    }
    parts.push('');
    parts.push(m.skill.body);
    parts.push('');
    parts.push('--- end skill ' + m.skill.id + ' ---');
    parts.push('');
  }
  parts.push('=== END REFERENCE SKILLS ===');
  return parts.join('\n');
}
