// Scores generated output against the Website Gold Standard.
//
// Two passes:
//   1. Structural — deterministic regex checks against each dimension.
//      Fast, no model call. Runs on every generated file combined.
//   2. Semantic — one model call comparing the generated code to the
//      reference examples. Names the top gaps and gives a 1–10 score.
//
// The final score is 70% structural + 30% semantic. Any non-negotiable
// dimension that fails forces the total to fail regardless of the rest.

import { DIMENSIONS, WEBSITE_STANDARD, type QualityDimension } from './standard';
import { REFERENCES, SHARED_PATTERNS } from './reference';

export interface DimensionResult {
  id: string;
  label: string;
  weight: number;
  nonNegotiable: boolean;
  passed: boolean;
  matchedSignal: string | null;
  requiredSkillIds: string[];
}

export interface StructuralResult {
  dimensions: DimensionResult[];
  structuralScore: number;
  nonNegotiableFailures: string[];
  totalSignalCount: number;
}

export interface SemanticResult {
  score: number;      // 1-10
  topGaps: string[];
  rationale: string;
  elapsedMs: number;
}

export interface QualityReport {
  passed: boolean;
  score: number;
  threshold: number;
  structural: StructuralResult;
  semantic: SemanticResult | null;
  dimensions: DimensionResult[];
  missing: string[];
}

/** Combine all generated files into one searchable string. */
export function joinFiles(files: Array<{ path: string; content: string }>): string {
  return files.map((f) => '// === ' + f.path + ' ===\n' + f.content).join('\n\n');
}

export function evaluateStructural(files: Array<{ path: string; content: string }>): StructuralResult {
  const combined = joinFiles(files);
  const dimensions: DimensionResult[] = [];
  let weightSum = 0;
  let weightPassed = 0;
  let signalCount = 0;
  const nonNegotiableFailures: string[] = [];

  for (const dim of DIMENSIONS) {
    let matchedSignal: string | null = null;
    for (const re of dim.requiredSignals) {
      if (re.test(combined)) {
        matchedSignal = re.source.slice(0, 60);
        signalCount += 1;
        break;
      }
    }
    const passed = matchedSignal !== null;
    weightSum += dim.weight;
    if (passed) weightPassed += dim.weight;
    if (!passed && dim.nonNegotiable) nonNegotiableFailures.push(dim.id);
    dimensions.push({
      id: dim.id,
      label: dim.label,
      weight: dim.weight,
      nonNegotiable: dim.nonNegotiable,
      passed,
      matchedSignal,
      requiredSkillIds: dim.requiredSkillIds,
    });
  }

  const structuralScore = weightSum > 0 ? Math.round((weightPassed / weightSum) * 100) : 0;
  return { dimensions, structuralScore, nonNegotiableFailures, totalSignalCount: signalCount };
}

/** Build the prompt that asks a model to rate generated output vs references. */
export function buildSemanticPrompt(files: Array<{ path: string; content: string }>): string {
  const combined = joinFiles(files);
  const referenceSummaries = REFERENCES.map(
    (r) => '- ' + r.name + ': ' + r.description + ' (pattern: ' + r.signaturePattern + ')'
  ).join('\n');
  const shared = SHARED_PATTERNS.map((p) => '- ' + p).join('\n');

  return [
    'You are evaluating a generated website against two reference examples.',
    '',
    'REFERENCE EXAMPLES:',
    referenceSummaries,
    '',
    'PATTERNS BOTH REFERENCES SHARE:',
    shared,
    '',
    'GENERATED OUTPUT:',
    '```',
    combined.slice(0, 12000),
    '```',
    '',
    'Rate the generated output on a 1-10 scale where:',
    '  10 = indistinguishable in craft from the references',
    '   7 = clearly inspired by the references, minor gaps',
    '   5 = functional but misses the cinematic feel',
    '   3 = generic, no motion or atmosphere',
    '   1 = broken or empty',
    '',
    'Reply with ONLY this JSON shape, no other text:',
    '{"score": <number>, "topGaps": ["...", "...", "..."], "rationale": "<one sentence>"}',
  ].join('\n');
}

export function parseSemanticResponse(raw: string, elapsedMs: number): SemanticResult {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) {
    return { score: 0, topGaps: ['Could not parse evaluator response'], rationale: raw.slice(0, 200), elapsedMs };
  }
  try {
    const j = JSON.parse(m[0]);
    const score = Math.max(1, Math.min(10, Number(j.score) || 0));
    const topGaps = Array.isArray(j.topGaps) ? j.topGaps.slice(0, 3).map(String) : [];
    const rationale = typeof j.rationale === 'string' ? j.rationale.slice(0, 240) : '';
    return { score, topGaps, rationale, elapsedMs };
  } catch (e) {
    return { score: 0, topGaps: ['Evaluator JSON was malformed'], rationale: String(e), elapsedMs };
  }
}

export function computeFinalReport(
  structural: StructuralResult,
  semantic: SemanticResult | null,
): QualityReport {
  // Convert semantic 1-10 to 0-100
  const semanticScore = semantic ? Math.round(semantic.score * 10) : null;
  const blended = semanticScore === null
    ? structural.structuralScore
    : Math.round(structural.structuralScore * 0.7 + semanticScore * 0.3);

  const passed =
    structural.nonNegotiableFailures.length === 0 &&
    blended >= WEBSITE_STANDARD.threshold;

  const missing = structural.dimensions.filter((d) => !d.passed).map((d) => d.id);

  return {
    passed,
    score: blended,
    threshold: WEBSITE_STANDARD.threshold,
    structural,
    semantic,
    dimensions: structural.dimensions,
    missing,
  };
}

export function dimensionById(id: string): QualityDimension | undefined {
  return DIMENSIONS.find((d) => d.id === id);
}
