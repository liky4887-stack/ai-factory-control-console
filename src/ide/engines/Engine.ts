// Every capability in the IDE implements this interface.
// Engines are pure: they receive a typed input, an EngineContext, and
// return an EngineResult. Nothing else.

import type { EngineContext } from './EngineContext';
export type { EngineContext } from './EngineContext';
import type { PhaseId } from './PhaseRegistry';

export interface EngineResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  elapsedMs: number;
  /** When true, this phase's failure should not abort the pipeline. */
  softFailure?: boolean;
}

export interface Engine<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly label: string;
  readonly phase: PhaseId;

  /** Optional: skip this engine without running. */
  shouldRun?(input: TInput, ctx: EngineContext): boolean;

  run(input: TInput, ctx: EngineContext): Promise<EngineResult<TOutput>>;
}

/** Wrap an async function with timing + try/catch + result envelope. */
export async function runWrapped<T>(
  fn: () => Promise<T>,
  opts: { softFailure?: boolean } = {},
): Promise<EngineResult<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    return { ok: true, data, error: null, elapsedMs: Date.now() - started, softFailure: opts.softFailure };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, data: null, error, elapsedMs: Date.now() - started, softFailure: opts.softFailure };
  }
}
