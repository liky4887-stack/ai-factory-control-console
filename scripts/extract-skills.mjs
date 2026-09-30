#!/usr/bin/env node
// Extract skills from local repos and write a TypeScript bundle.
//
// Usage:
//   node scripts/extract-skills.mjs <root-1> [<root-2> ...] [--include name1,name2,...]
//
// Two layouts supported per root:
//   A) <root>/.claude/skills/<name>/SKILL.md   (Claude plugin layout)
//   B) <root>/<name>/SKILL.md                  (flat layout)
//
// --include filters by folder name (case sensitive). Omit to include all.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

// ─── Arg parsing ──────────────────────────────────────────────
const args = process.argv.slice(2);
const roots = [];
let includeFilter = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--include') {
    includeFilter = new Set(
      (args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean),
    );
  } else {
    roots.push(a);
  }
}
if (roots.length === 0) {
  console.error('Usage: node extract-skills.mjs <root> [...] [--include a,b,c]');
  process.exit(1);
}

// ─── YAML frontmatter parser (subset) ─────────────────────────
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      const arr = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      if (indent === 0) { fm[key] = arr; currentKey = null; }
      else if (currentKey) fm[currentKey] = { ...(fm[currentKey] || {}), [key]: arr };
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

// ─── Tag derivation ───────────────────────────────────────────
const STOP = new Set([
  'the','a','an','and','or','of','for','to','in','on','at','by','with','from',
  'this','that','these','those','is','are','was','were','be','been','being',
  'when','where','which','who','what','how','why','use','used','using','can',
  'should','must','will','would','could','may','might','do','does','did','done',
  'it','its','if','then','else','but','not','no','yes','as','so','than','too',
  'very','more','most','less','least','also','just','only','any','all','some',
  'each','every','into','over','under','across','between','about','via',
  'include','includes','including','etc','eg','ie','vs','per','see','get',
  'skill','skills','encodes','encodes','following','apply','applies',
  'have','has','had','their','there','here','they','them','you','your','yours',
]);

function tagWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w) && !/^\d+$/.test(w));
}

function deriveTags(id, description, body, extraTags) {
  // Strip the leading "skills-" prefix from the id so tags stay useful
  const idForTags = id.replace(/^skills-/, '');
  const fromName = idForTags.split(/[-_]/).flatMap(tagWords);
  const fromDesc = tagWords(description || '').slice(0, 25);
  const fromBody = tagWords(
    (body || '').split('\n').filter((l) => l.startsWith('#') || l.startsWith('- ')).join(' ').slice(0, 2500)
  ).slice(0, 15);
  const tags = new Set([...(extraTags || []), ...fromName, ...fromDesc, ...fromBody]);
  return Array.from(tags).slice(0, 20);
}

// ─── Repo source URL ──────────────────────────────────────────
function repoSourceUrl(root) {
  try {
    const url = execSync('git -C ' + JSON.stringify(root) + ' remote get-url origin 2>/dev/null', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (url) return url;
  } catch {}
  return 'file://' + root;
}

// ─── Find skill folders in one root ───────────────────────────
function findSkillFolders(root) {
  const claudeSkills = join(root, '.claude', 'skills');
  if (existsSync(claudeSkills)) {
    const out = [];
    for (const name of readdirSync(claudeSkills)) {
      const dir = join(claudeSkills, name);
      try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
      if (!existsSync(join(dir, 'SKILL.md'))) continue;
      out.push({ name, dir, sourcePath: '.claude/skills/' + name + '/SKILL.md', repoRoot: root });
    }
    return out;
  }
  const out = [];
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
    if (!existsSync(join(dir, 'SKILL.md'))) continue;
    out.push({ name, dir, sourcePath: name + '/SKILL.md', repoRoot: root });
  }
  return out;
}

// ─── Extract one skill ────────────────────────────────────────
function extractSkill(folder, sourceUrl) {
  const skillMd = join(folder.dir, 'SKILL.md');
  const raw = readFileSync(skillMd, 'utf8');
  const { fm, body } = parseFrontmatter(raw);

  // Canonical id: use the frontmatter name if present, else strip the
  // leading "skills-" prefix from the folder name so ids stay clean.
  const fmName = typeof fm.name === 'string' ? fm.name.trim() : '';
  const folderId = folder.name.replace(/^skills-/, '');
  const id = (fmName || folderId).replace(/\s+/g, '-');

  const label = id.split('-').map((s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '').join(' ');
  const description = typeof fm.description === 'string' ? fm.description : '';
  const version = (fm.metadata && typeof fm.metadata === 'object' && fm.metadata.version) || fm.version || '0.0.0';
  const author = (fm.metadata && typeof fm.metadata === 'object' && fm.metadata.author) || fm.author || '';
  const license = typeof fm.license === 'string' ? fm.license : '';

  const refsDir = join(folder.dir, 'references');
  const referenceFiles = [];
  if (existsSync(refsDir) && statSync(refsDir).isDirectory()) {
    for (const f of readdirSync(refsDir)) if (f.endsWith('.md')) referenceFiles.push(f);
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
    source: sourceUrl,
    sourceRepo: basename(folder.repoRoot),
    sourcePath: folder.sourcePath,
  };
}

// ─── Walk all roots ───────────────────────────────────────────
const allSkills = [];
const seenIds = new Set();

for (const root of roots) {
  if (!existsSync(root)) {
    console.error('// skipped (missing): ' + root);
    continue;
  }
  const sourceUrl = repoSourceUrl(root);
  const folders = findSkillFolders(root);
  // The --include filter applies only to flat-layout roots (where a
  // repo may carry many unrelated skills). A .claude/skills/ root is
  // treated as curated and included in full.
  const isFlatLayout = folders.length > 0 && !folders[0].sourcePath.startsWith('.claude/');
  for (const folder of folders) {
    if (includeFilter && isFlatLayout && !includeFilter.has(folder.name)) continue;
    const skill = extractSkill(folder, sourceUrl);
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
const sources = roots.map((r) => basename(r));
const meta = {
  generatedAt: new Date().toISOString(),
  sources,
  count: allSkills.length,
  totalBytes: allSkills.reduce((n, s) => n + s.bytes, 0),
};

function tsString(s) { return JSON.stringify(s); }
function tsStringArray(a) { return '[' + a.map(tsString).join(', ') + ']'; }

const lines = [];
lines.push('// AUTO-GENERATED by scripts/extract-skills.mjs — do not edit by hand.');
lines.push('// Regenerate with: node scripts/extract-skills.mjs <root>... [--include a,b,c]');
lines.push('//');
lines.push('// Generated at: ' + meta.generatedAt);
lines.push('// Sources: ' + meta.sources.join(', '));
lines.push('// Skills: ' + meta.count + ' · Total bytes: ' + meta.totalBytes);
lines.push('');
lines.push("import type { Skill } from './types';");
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
lines.push('  sources: ' + tsStringArray(sources) + ',');
lines.push('  count: ' + meta.count + ',');
lines.push('  totalBytes: ' + meta.totalBytes + ',');
lines.push('} as const;');
lines.push('');

process.stdout.write(lines.join('\n'));
console.error('// Extracted ' + allSkills.length + ' skills, ' + meta.totalBytes + ' bytes');
