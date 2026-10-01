// QualityEngine — scores the project's generated output against the
// Website Gold Standard and emits every dimension result to the Glass Box.
//
// Two passes:
//   1. Structural — deterministic regex checks against the 12 dimensions.
//   2. Semantic — one model call comparing output to the reference examples.
//
// Runs as the phase `quality`, placed between `diff` and `simulate` in the
// pipeline. Fires only on website-build composites and on any prompt that
// names a landing page / site / portfolio.

import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';
import {
  evaluateStructural,
  buildSemanticPrompt,
  parseSemanticResponse,
  computeFinalReport,
  type QualityReport,
} from '../../quality';

export interface QualityInput {
  /** Optional: restrict the eval to these specific paths. */
  paths?: string[];
}

export interface QualityOutput {
  report: QualityReport;
  filesEvaluated: number;
  totalBytes: number;
}

// Only evaluate source files that could plausibly be part of the site.
const SOURCE_EXTS = /\.(html|css|js|jsx|ts|tsx|vue|svelte|astro)$/i;
const SKIP_PATHS = /(node_modules|dist\/|build\/|\.git\/|\.next\/|package-lock\.json)/;

// Cap how much we feed into the model for the semantic pass.
const MAX_FILES = 40;
const MAX_BYTES_FOR_EVAL = 200_000;

export class QualityEngine implements Engine<QualityInput, QualityOutput> {
  readonly id = 'quality';
  readonly label = 'Quality Standard';
  readonly phase = 'quality' as const;

  shouldRun(_input: QualityInput, ctx: EngineContext): boolean {
    if (!ctx.projectId) return false;
    // Only score when the website-build composite fired this run.
    const skills = ctx.getPhaseOutput<{ matches?: Array<{ matchedOn?: string[] }> }>('skills');
    if (!skills || !Array.isArray(skills.matches)) return false;
    return skills.matches.some(
      (m) => Array.isArray(m.matchedOn) && m.matchedOn.includes('composite:website-build'),
    );
  }

  async run(input: QualityInput, ctx: EngineContext): Promise<EngineResult<QualityOutput>> {
    return runWrapped(async () => {
      const listed = await ctx.listFiles();
      const candidates = listed.filter((f) => {
        if (SKIP_PATHS.test(f.path)) return false;
        if (!SOURCE_EXTS.test(f.path)) return false;
        if (input.paths && input.paths.length > 0) return input.paths.includes(f.path);
        return true;
      });

      if (candidates.length === 0) {
        ctx.emit('Audit', 'quality', 'info', 'No source files to evaluate.');
        const emptyReport = computeFinalReport(
          { dimensions: [], structuralScore: 0, nonNegotiableFailures: [], totalSignalCount: 0 },
          null,
        );
        return { report: emptyReport, filesEvaluated: 0, totalBytes: 0 };
      }

      // Read up to MAX_FILES source files, capped at MAX_BYTES_FOR_EVAL.
      const files: Array<{ path: string; content: string }> = [];
      let totalBytes = 0;
      for (const f of candidates.slice(0, MAX_FILES)) {
        if (totalBytes >= MAX_BYTES_FOR_EVAL) break;
        try {
          const content = await ctx.readFile(f.path);
          files.push({ path: f.path, content });
          totalBytes += content.length;
        } catch { /* skip unreadable */ }
      }

      ctx.emit('Audit', 'quality', 'info',
        'Evaluating ' + files.length + ' source file' + (files.length === 1 ? '' : 's') +
        ' against the Website Gold Standard...',
      );

      // 1) Structural pass
      const structural = evaluateStructural(files);
      for (const d of structural.dimensions) {
        ctx.emit(
          'Audit',
          'quality',
          d.passed ? 'success' : (d.nonNegotiable ? 'error' : 'warn'),
          (d.passed ? '✓ ' : (d.nonNegotiable ? '✗ ' : '○ ')) + d.label +
            (d.passed ? '' : ' — missing'),
          { dimension: d.id, weight: d.weight, nonNegotiable: d.nonNegotiable },
        );
      }

      ctx.emit('Audit', 'quality', 'info',
        'Structural score: ' + structural.structuralScore + '/100' +
        (structural.nonNegotiableFailures.length > 0
          ? ' · non-negotiable failures: ' + structural.nonNegotiableFailures.join(', ')
          : ''),
        {
          structuralScore: structural.structuralScore,
          signalsMatched: structural.totalSignalCount,
        },
      );

      // 2) Semantic pass — one model call. Failure is soft; we still emit
      //    the structural result if the model cannot answer.
      let semantic = null;
      try {
        const prompt = buildSemanticPrompt(files);
        const t0 = Date.now();
        const resp = await ctx.callModel([{ role: 'user', content: prompt }]);
        semantic = parseSemanticResponse(resp.content, Date.now() - t0);
        ctx.emit('Audit', 'quality',
          semantic.score >= 6 ? 'success' : 'warn',
          'Semantic score: ' + semantic.score + '/10' +
          (semantic.topGaps.length > 0 ? ' · gaps: ' + semantic.topGaps.join(' · ') : ''),
          { topGaps: semantic.topGaps, rationale: semantic.rationale },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.emit('Audit', 'quality', 'warn', 'Semantic pass skipped: ' + msg);
      }

      // 3) Combine
      const report = computeFinalReport(structural, semantic);

      ctx.emit('Audit', 'quality',
        report.passed ? 'success' : 'warn',
        report.passed
          ? 'PASS · ' + report.score + '/' + report.threshold
          : 'BELOW STANDARD · ' + report.score + '/' + report.threshold +
            (report.missing.length > 0 ? ' · missing: ' + report.missing.join(', ') : ''),
        {
          score: report.score,
          threshold: report.threshold,
          passed: report.passed,
          missing: report.missing,
          nonNegotiableFailures: structural.nonNegotiableFailures,
        },
      );

      return { report, filesEvaluated: files.length, totalBytes };
    }, { softFailure: true });
  }
}
