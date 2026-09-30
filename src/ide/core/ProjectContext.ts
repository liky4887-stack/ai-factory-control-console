// Reads a project's file tree from the backend and turns it into a
// compact context block that the orchestrator injects as a system
// message. This is what makes the Brain aware of the codebase.

import { api } from '../../services/api';
import type { BuiltFile } from '../../services/api';

const MAX_TREE_CHARS = 6000;      // cap on the file tree listing
const MAX_FILE_CHARS = 2500;      // cap per individual file
const MAX_TOTAL_FILE_CHARS = 20000; // cap on all included file contents

export interface ProjectContext {
  projectId: string;
  /** The loaded file list. */
  files: BuiltFile[];
  /** Contents of files that were explicitly referenced or that are cheap to read. */
  contents: Map<string, string>;
  /** Set when the last refresh happened. */
  loadedAt: number;
}

/**
 * Fetch the current file list for a project and pre-load a small set
 * of "hot" files (package.json, README.md, tsconfig.json, etc.) so
 * follow-up questions are fast.
 */
export async function loadProjectContext(projectId: string): Promise<ProjectContext> {
  let files: BuiltFile[] = [];
  try {
    files = await api.listProjectFiles(projectId);
  } catch {
    files = [];
  }

  const hot = ['package.json', 'app.json', 'tsconfig.json', 'README.md', 'index.ts', 'index.tsx', 'App.tsx', 'app.tsx'];
  const contents = new Map<string, string>();
  let budget = MAX_TOTAL_FILE_CHARS;

  for (const f of files) {
    if (budget <= 0) break;
    const base = f.path.split('/').pop() || f.path;
    if (!hot.includes(base) && !hot.includes(f.path)) continue;
    if (f.bytes > MAX_FILE_CHARS) continue;
    try {
      const c = await api.getProjectFile(projectId, f.path);
      contents.set(f.path, c);
      budget -= c.length;
    } catch { /* skip */ }
  }

  return { projectId, files, contents, loadedAt: Date.now() };
}

/** Extract candidate filenames mentioned in a prompt (e.g. "app.json", "src/foo.ts"). */
export function filesMentionedIn(prompt: string, available: string[]): string[] {
  const hits = new Set<string>();
  const lower = prompt.toLowerCase();
  for (const path of available) {
    const base = path.split('/').pop() || path;
    if (lower.includes(path.toLowerCase())) { hits.add(path); continue; }
    if (base.length > 2 && lower.includes(base.toLowerCase())) hits.add(path);
  }
  return Array.from(hits);
}

/**
 * Build the system-message context block that gets prepended to every
 * request. Two parts:
 *   1. The file tree (capped)
 *   2. Full contents of files the prompt explicitly mentions
 *
 * Returns "" if the project has no files.
 */
export async function buildContextBlock(
  ctx: ProjectContext,
  prompt: string,
): Promise<string> {
  if (ctx.files.length === 0) return '';

  // Part 1 — file tree
  const lines = ctx.files.map((f) => '  ' + f.path + '  (' + f.bytes + 'B)');
  let tree = lines.join('\n');
  if (tree.length > MAX_TREE_CHARS) {
    tree = tree.slice(0, MAX_TREE_CHARS) + '\n  …(' + (tree.length - MAX_TREE_CHARS) + ' more chars truncated)';
  }

  // Part 2 — files referenced in the prompt
  const mentioned = filesMentionedIn(prompt, ctx.files.map((f) => f.path));
  let extras = '';
  let extraBudget = MAX_TOTAL_FILE_CHARS;

  for (const path of mentioned) {
    if (extraBudget <= 0) break;
    let content = ctx.contents.get(path);
    if (!content) {
      try {
        content = await api.getProjectFile(ctx.projectId, path);
        if (content.length <= MAX_FILE_CHARS) ctx.contents.set(path, content);
      } catch { continue; }
    }
    if (!content) continue;
    const trimmed = content.length > MAX_FILE_CHARS
      ? content.slice(0, MAX_FILE_CHARS) + '\n…(' + (content.length - MAX_FILE_CHARS) + ' more chars truncated)'
      : content;
    extras += '\n--- ' + path + ' (' + content.length + ' bytes) ---\n' + trimmed + '\n';
    extraBudget -= trimmed.length;
  }

  return [
    '=== PROJECT CONTEXT ===',
    'Project ID: ' + ctx.projectId,
    'Files (' + ctx.files.length + ' total):',
    tree,
    extras ? '\nFiles mentioned in the request:' : '',
    extras,
    '=== END PROJECT CONTEXT ===',
    '',
    'Use this context to understand the codebase. If the user asks about a',
    'file that is not shown above, say so and ask which file to read.',
  ].join('\n');
}
