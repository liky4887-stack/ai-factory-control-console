// A Skill is a prompt fragment the IDE can inject into a model call
// when the request touches the skill's domain.
//
// The `body` is the full SKILL.md content (after frontmatter). The
// `referenceFiles` list names supporting docs that live in the source
// repo but are NOT bundled — they can be fetched on demand.

export interface Skill {
  /** Stable slug, e.g. "ui-ux-pro-max". */
  id: string;
  /** Human label, e.g. "Ui Ux Pro Max". */
  label: string;
  /** One-line description from the frontmatter, used for matching. */
  description: string;
  /** Keywords used to match the skill against a user prompt. */
  tags: string[];
  /**
   * Domain bucket. Drives UI labeling and per-domain gating.
   *   - ui-ux  : interface polish, design, animation for UI, accessibility
   *   - media  : video composition, hyperframes, motion graphics, captions
   */
  domain: 'ui-ux' | 'media';
  /** Full SKILL.md body (frontmatter stripped). */
  body: string;
  /** Size of the source SKILL.md in bytes. */
  bytes: number;
  /** Version from frontmatter metadata, if present. */
  version: string;
  /** Author from frontmatter metadata, if present. */
  author: string;
  /** SPDX license or license file reference. */
  license: string;
  /** Filenames under references/ — not bundled, fetchable later. */
  referenceFiles: string[];
  /** Origin URL of the repo the skill was extracted from. */
  source: string;
  /** Short repo name, e.g. "ui-ux-pro-max-skill". */
  sourceRepo: string;
  /** Path within the source repo, e.g. ".claude/skills/ui-ux-pro-max/SKILL.md". */
  sourcePath: string;
}

export interface SkillBundleMeta {
  generatedAt: string;
  sources: readonly string[];
  count: number;
  totalBytes: number;
}

/** A skill selected by the matcher to be injected into a prompt. */
export interface MatchedSkill {
  skill: Skill;
  /** Higher is better. */
  score: number;
  /** Which tokens matched. Useful for the Glass Box. */
  matchedOn: string[];
}
