// Scans source files for import / require statements and builds a
// lightweight dependency graph. Not a full AST — enough to answer
// "what will this change touch?" in <1s.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface AuditNode { path: string; bytes: number; imports: string[] }
export interface AuditHotSpot { path: string; inboundCount: number }
export interface AuditOutput {
  nodes: AuditNode[];
  hot: AuditHotSpot[];
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const IMPORT_RE = /(?:import\s+[\s\S]*?from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\))/g;
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

function extractImports(src: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[1] || m[2] || m[3];
    if (spec) out.push(spec);
  }
  return out;
}

function resolveImport(spec: string, fromFile: string, allPaths: string[]): string[] {
  if (!spec.startsWith('.')) return [];
  const parts = fromFile.split('/');
  parts.pop();
  for (const seg of spec.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  const base = parts.join('/');
  const candidates = [
    base,
    base + '.ts', base + '.tsx', base + '.js', base + '.jsx',
    base + '/index.ts', base + '/index.tsx', base + '/index.js',
  ];
  return candidates.filter((c) => allPaths.includes(c));
}

export class AuditEngine implements Engine<{ scope?: string }, AuditOutput> {
  readonly id = 'audit';
  readonly label = 'Deep Audit';
  readonly phase = 'audit' as const;

  shouldRun(_input: { scope?: string }, ctx: EngineContext): boolean {
    return !!ctx.projectId;
  }

  async run(_input: { scope?: string }, ctx: EngineContext): Promise<EngineResult<AuditOutput>> {
    return runWrapped(async () => {
      const files = await ctx.listFiles();
      const sourceFiles = files.filter((f: { path: string; bytes: number }) => SOURCE_EXT.test(f.path));
      const allPaths = sourceFiles.map((f: { path: string; bytes: number }) => f.path);

      ctx.emit('Audit', 'audit', 'info', 'Scanning ' + sourceFiles.length + ' source files...');

      const nodes: AuditNode[] = [];
      const inbound = new Map<string, number>();
      const MAX_SCAN = 120;
      const slice = sourceFiles.slice(0, MAX_SCAN);

      for (const f of slice) {
        try {
          const content = await ctx.readFile(f.path);
          const specs = extractImports(content);
          const resolved: string[] = [];
          for (const s of specs) {
            const hits = resolveImport(s, f.path, allPaths);
            for (const h of hits) {
              resolved.push(h);
              inbound.set(h, (inbound.get(h) || 0) + 1);
            }
          }
          nodes.push({ path: f.path, bytes: f.bytes, imports: resolved });
        } catch {}
      }

      const hot: AuditHotSpot[] = Array.from(inbound.entries())
        .map(([path, inboundCount]) => ({ path, inboundCount }))
        .sort((a, b) => b.inboundCount - a.inboundCount)
        .slice(0, 10);

      const risk: 'low' | 'medium' | 'high' =
        hot.length > 0 && hot[0].inboundCount >= 5 ? 'high'
        : hot.length > 0 && hot[0].inboundCount >= 2 ? 'medium'
        : 'low';

      const summary =
        'Scanned ' + nodes.length + ' files, ' +
        inbound.size + ' import edges. ' +
        (hot.length > 0 ? 'Hotspot: ' + hot[0].path + ' (' + hot[0].inboundCount + ').' : 'No hubs.');

      ctx.emit('Audit', 'audit', 'success', summary, { riskLevel: risk, edges: inbound.size });

      return { nodes, hot, summary, riskLevel: risk };
    }, { softFailure: true });
  }
}
