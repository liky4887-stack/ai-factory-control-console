// Every IDE capability (Audit, Diff, Simulation, Heal, Evolution, ...)
// implements this interface. The orchestrator only knows EngineContext,
// EngineResult, and the run() signature — engines are fully pluggable.

import type { EngineContext, EngineResult } from '../core/types';

export interface Engine<Input, Output> {
  readonly id: string;
  readonly label: string;
  /** Optional: cheap check before running. */
  canRun?(input: Input, ctx: EngineContext): boolean;
  run(input: Input, ctx: EngineContext): Promise<EngineResult<Output>>;
}

/** Shared helper for wrapping work in try/catch + timing + a result envelope. */
export async function runWrapped<T>(
  fn: () => Promise<T>,
): Promise<EngineResult<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    return { ok: true, data, error: null, elapsedMs: Date.now() - started };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, data: null, error, elapsedMs: Date.now() - started };
  }
}
