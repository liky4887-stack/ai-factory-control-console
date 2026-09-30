// EngineContext is the single interface every engine receives when it runs.
// It gives engines access to: activity log, model calls, file I/O, and
// the outputs of earlier phases. This is what makes engines composable
// instead of siloed.

import type { ActivityPhase, ActivitySource, ActivityStatus } from '../core/types';
import type { PhaseId } from './PhaseRegistry';

export interface EngineContext {
  /** Current task id (for event correlation). */
  readonly taskId: string | null;
  /** Project id if the pipeline is scoped to one. */
  readonly projectId: string | null;
  /** The original user prompt. */
  readonly prompt: string;

  /** Emit a structured event into the Glass Box. */
  emit(
    source: ActivitySource,
    phase: ActivityPhase | PhaseId,
    status: ActivityStatus,
    message: string,
    metadata?: Record<string, unknown>,
  ): void;

  /** Call a model. Uses the registry's fallback chain. */
  callModel(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: { enginePreference?: string[] },
  ): Promise<{ content: string; engineId: string; engineLabel: string }>;

  /** List project files. Empty if no project context. */
  listFiles(): Promise<Array<{ path: string; bytes: number }>>;

  /** Read a file by path. */
  readFile(path: string): Promise<string>;

  /** Write a file. */
  writeFile(path: string, content: string): Promise<void>;

  /** Read the output of an earlier phase in this run. */
  getPhaseOutput<T = unknown>(phase: PhaseId): T | undefined;

  /** Provide the current phase output to later phases. */
  setPhaseOutput(phase: PhaseId, output: unknown): void;

  /** Read/write arbitrary keys in the IDE's persistent state. */
  getState<T = unknown>(key: string): Promise<T | undefined>;
  setState<T = unknown>(key: string, value: T): Promise<void>;
}
