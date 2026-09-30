#!/usr/bin/env node
// Extract skills from one or more GitHub repo clones.
//
// Usage:
//   node scripts/extract-skills.mjs <repo-root-1> [<repo-root-2> ...]
//
// Expects repos to contain .claude/skills/<name>/SKILL.md with YAML
// frontmatter. Writes TypeScript to stdout.
//
// Output is a bundle.ts containing a Skill[] array.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-skills.mjs <repo-root> [<repo-root> ...]');
  process.exit(1);
}

// ─── Minimal YAML frontmatter parser ──────────────────────────
// Supports: key: value, key: "quoted", key: [a, b, c], and one level
// of nesting via indentation (e.g. metadata: -> author: x). No deps.

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const yaml = m[1];
  const body = m[2];

  const fm = {};
  let currentKey = null;
  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();
    const colon = trimmed.indexOf(':');
    if (colon < 0) continue;
    const key = trimmed.slice(0, colon).trim();
    let val = trimmed.slice(colon + 1).trim();

    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // Inline array
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1);
      const arr = inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      if (indent === 0) { fm[key] = arr; currentKey = null; }
      else if (currentKey) { fm[currentKey] = { ...(fm[currentKey] || {}), [key]: arr }; }
      continue;
    }

    if (indent === 0) {
      if (val === '') { fm[key] = {}; currentKey = key; }
      else { fm[key] = val; currentKey = null; }
    } else if (currentKey) {
      fm[currentKey] = { ...(fm[currentKey] || {}), [key]: val };
    }
  }
  return { fm, body };
}

// ─── Tag extraction ───────────────────────────────────────────
// Pulls meaningful words from the description + folder name, filters
// stopwords, dedupes. Cap at 16 tags.

const STOP = new Set([
  'the','a','an','and','or','of','for','to','in','on','at','by','with','from',
  'this','that','these','those','is','are','was','were','be','been','being',
  'when','where','which','who','what','how','why','use','used','using','can',
  'should','must','will','would','could','may','might','do','does','did','done',
  'it','its','if','then','else','but','not','no','yes','as','so','than','too',
  'very','more','most','less','least','also','just','only','any','all','some',
  'each','every','any','into','over','under','across','between','about','via',
  'include','includes','including','etc','eg','ie','vs','per','was'
]);

function tagWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w) && !/^\d+$/.test(w));
}

function deriveTags(name, description, body, extraTags) {
  const fromName = name.split(/[-_]/).flatMap(tagWords);
  const fromDesc = tagWords(description || '').slice(0, 20);
  const fromBody = tagWords(
    (body || '').split('\n').filter((l) => l.startsWith('#') || l.startsWith('- ')).join(' ').slice(0, 2000)
  ).slice(0, 15);
  const tags = new Set([...(extraTags || []), ...fromName, ...fromDesc, ...fromBody]);
  return Array.from(tags).slice(0, 20);
}

// ─── Extract one skill folder ─────────────────────────────────
function extractSkill(repoRoot, skillFolderName) {
  const skillDir = join(repoRoot, '.claude', 'skills', skillFolderName);
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) return null;

  const raw = readFileSync(skillMd, 'utf8');
  const { fm, body } = parseFrontmatter(raw);

  const id = (typeof fm.name === 'string' ? fm.name : skillFolderName).replace(/\s+/g, '-');
  const label = id.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const description = typeof fm.description === 'string' ? fm.description : '';
  const version = (fm.metadata && typeof fm.metadata === 'object' && fm.metadata.version) || (fm.version || '0.0.0');
  const author = (fm.metadata && typeof fm.metadata === 'object' && fm.metadata.author) || fm.author || '';
  const license = typeof fm.license === 'string' ? fm.license : '';

  // Collect reference filenames (basenames only, not contents)
  const refsDir = join(skillDir, 'references');
  const referenceFiles = [];
  if (existsSync(refsDir) && statSync(refsDir).isDirectory()) {
    for (const f of readdirSync(refsDir)) {
      if (f.endsWith('.md')) referenceFiles.push(f);
    }
  }

  const tags = deriveTags(id, description, body, fm.keywords || []);

  return {
    id,
    label,
    description,
    tags,
    body: body.trim(),
    bytes: raw.length,
    version,
    author,
    license,
    referenceFiles,
    source: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    sourceRepo: path_basename(repoRoot),
    sourcePath: '.claude/skills/' + skillFolderName + '/SKILL.md',
  };
}

// ─── Walk all repos ───────────────────────────────────────────
const allSkills = [];
const seenIds = new Set();

for (const repoRoot of args) {
  const skillsRoot = join(repoRoot, '.claude', 'skills');
  if (!existsSync(skillsRoot)) {
    console.error('// skipped (no .claude/skills): ' + repoRoot);
    continue;
  }
  for (const folder of readdirSync(skillsRoot)) {
    const skill = extractSkill(repoRoot, folder);
    if (!skill) continue;
    if (seenIds.has(skill.id)) {
      console.error('// skipped duplicate id: ' + skill.id);
      continue;
    }
    seenIds.add(skill.id);
    allSkills.push(skill);
  }
}

// ─── Emit TypeScript ──────────────────────────────────────────
const meta = {
  generatedAt: new Date().toISOString(),
  sources: args.map((a) => path_basename(a)),
  count: allSkills.length,
  totalBytes: allSkills.reduce((n, s) => n + s.bytes, 0),
};

function path_basename(p) { return p.split('/').pop() || p; }

function tsString(s) { return JSON.stringify(s); }
function tsStringArray(a) { return '[' + a.map(tsString).join(', ') + ']'; }

const lines = [];
lines.push('// AUTO-GENERATED by scripts/extract-skills.mjs — do not edit by hand.');
lines.push('// Regenerate with: node scripts/extract-skills.mjs <repo-root>...');
lines.push('//');
lines.push('// Generated at: ' + meta.generatedAt);
lines.push('// Sources: ' + meta.sources.join(', '));
lines.push('// Skills: ' + meta.count + ' · Total bytes: ' + meta.totalBytes);
lines.push('');
lines.push('import type { Skill } from \'./types\';');
lines.push('');
lines.push('export const SKILL_BUNDLE: Skill[] = [');
for (const s of allSkills) {
  lines.push('  {');
  lines.push('    id: ' + tsString(s.id) + ',');
  lines.push('    label: ' + tsString(s.label) + ',');
  lines.push('    description: ' + tsString(s.description) + ',');
  lines.push('    tags: ' + tsStringArray(s.tags) + ',');
  lines.push('    bytes: ' + s.bytes + ',');
  lines.push('    version: ' + tsString(s.version) + ',');
  lines.push('    author: ' + tsString(s.author) + ',');
  lines.push('    license: ' + tsString(s.license) + ',');
  lines.push('    referenceFiles: ' + tsStringArray(s.referenceFiles) + ',');
  lines.push('    source: ' + tsString(s.source) + ',');
  lines.push('    sourceRepo: ' + tsString(s.sourceRepo) + ',');
  lines.push('    sourcePath: ' + tsString(s.sourcePath) + ',');
  lines.push('    body: ' + tsString(s.body) + ',');
  lines.push('  },');
}
lines.push('];');
lines.push('');
lines.push('export const SKILL_BUNDLE_META = {');
lines.push('  generatedAt: ' + tsString(meta.generatedAt) + ',');
lines.push('  sources: ' + tsStringArray(meta.sources) + ',');
lines.push('  count: ' + meta.count + ',');
lines.push('  totalBytes: ' + meta.totalBytes + ',');
lines.push('} as const;');
lines.push('');

process.stdout.write(lines.join('\n'));
console.error('// Extracted ' + allSkills.length + ' skills, ' + meta.totalBytes + ' bytes');
