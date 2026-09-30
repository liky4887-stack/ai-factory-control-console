// Structured line diff via LCS. O(n*m), fine for source files.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface DiffHunk {
  kind: 'add' | 'del' | 'ctx';
  oldLine?: number;
  newLine?: number;
  text: string;
}
export interface FileDiff { path: string; added: number; removed: number; hunks: DiffHunk[] }
export interface DiffOutput { files: FileDiff[]; totalAdded: number; totalRemoved: number }

function lcsMatrix(a: string[], b: string[]): number[][] {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

export function diffLines(original: string, proposed: string): FileDiff {
  const a = original.split(/\r?\n/);
  const b = proposed.split(/\r?\n/);

  if (a.length * b.length > 4_000_000) {
    return {
      path: '', added: b.length, removed: a.length,
      hunks: [
        ...a.map((t, i) => ({ kind: 'del' as const, oldLine: i + 1, text: t })),
        ...b.map((t, i) => ({ kind: 'add' as const, newLine: i + 1, text: t })),
      ],
    };
  }

  const dp = lcsMatrix(a, b);
  const hunks: DiffHunk[] = [];
  let i = 0, j = 0, added = 0, removed = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { hunks.push({ kind: 'ctx', oldLine: i + 1, newLine: j + 1, text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { hunks.push({ kind: 'del', oldLine: i + 1, text: a[i] }); i++; removed++; }
    else { hunks.push({ kind: 'add', newLine: j + 1, text: b[j] }); j++; added++; }
  }
  while (i < a.length) { hunks.push({ kind: 'del', oldLine: i + 1, text: a[i] }); i++; removed++; }
  while (j < b.length) { hunks.push({ kind: 'add', newLine: j + 1, text: b[j] }); j++; added++; }

  return { path: '', added, removed, hunks };
}

export class DiffEngine implements Engine<{ files: Array<{ path: string; proposed: string }> }, DiffOutput> {
  readonly id = 'diff';
  readonly label = 'Visual Diff';
  readonly phase = 'diff' as const;

  async run(
    input: { files: Array<{ path: string; proposed: string }> },
    ctx: EngineContext,
  ): Promise<EngineResult<DiffOutput>> {
    return runWrapped(async () => {
      const results: FileDiff[] = [];
      let totalAdded = 0, totalRemoved = 0;
      for (const f of input.files) {
        let original = '';
        try { original = await ctx.readFile(f.path); } catch {}
        const d = diffLines(original, f.proposed);
        d.path = f.path;
        results.push(d);
        totalAdded += d.added;
        totalRemoved += d.removed;
      }
      const summary = results.length + ' file(s) · +' + totalAdded + ' / -' + totalRemoved;
      ctx.emit('Diff', 'diff', 'success', summary, { files: results.length, added: totalAdded, removed: totalRemoved });
      return { files: results, totalAdded, totalRemoved };
    }, { softFailure: true });
  }
}
