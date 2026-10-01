// Core domain types for the Sovereign IDE.
// Every engine and orchestration layer depends on these shapes.
// No React, no side effects — pure types.

// ─── Activity log ─────────────────────────────────────────────
export type ActivitySource =
  | 'Orchestrator'
  | 'Planning'
  | 'Audit'
  | 'CodeGen'
  | 'Refactor'
  | 'Diff'
  | 'Test'
  | 'Simulation'
  | 'Deploy'
  | 'Heal'
  | 'Evolution'
  | 'Market'
  | 'Meta'
  | 'System';

export type ActivityPhase =
  | 'idle'
  | 'understand'
  | 'plan'
  | 'audit'
  | 'generate'
  | 'diff'
  | 'quality'
  | 'simulate'
  | 'deploy'
  | 'monitor'
  | 'heal';

export type ActivityStatus = 'start' | 'progress' | 'success' | 'warn' | 'error' | 'info';

export interface ActivityEvent {
  id: string;
  taskId: string | null;
  timestamp: number;
  source: ActivitySource;
  phase: ActivityPhase;
  status: ActivityStatus;
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── Task DAG ─────────────────────────────────────────────────
export type TaskKind = 'understand' | 'plan' | 'audit' | 'generate' | 'diff' | 'simulate' | 'deploy' | 'monitor' | 'heal';

export interface TaskNode {
  id: string;
  parentTaskId: string | null;
  kind: TaskKind;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: number | null;
  finishedAt: number | null;
  dependsOn: string[];
  output: Record<string, unknown>;
  error: string | null;
}

export interface TaskGraph {
  id: string;
  rootPrompt: string;
  createdAt: number;
  nodes: TaskNode[];
}

// ─── Orchestrator state machine ───────────────────────────────
export type OrchestratorState = ActivityPhase;

export interface OrchestratorSnapshot {
  state: OrchestratorState;
  taskId: string | null;
  since: number;
  lastMessage: string;
  error: string | null;
}

// ─── Model agent ──────────────────────────────────────────────
export interface ModelAgentRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  taskId: string | null;
  enginePreference?: string[];
  metadata?: Record<string, unknown>;
}

export interface ModelAgentResponse {
  engineId: string;
  engineLabel: string;
  content: string;
  elapsedMs: number;
  fellBack: boolean;
}

export interface ModelAgent {
  readonly id: string;      // 'agent_deepseek' etc.
  readonly label: string;
  readonly engineId: string;
  call(req: ModelAgentRequest): Promise<ModelAgentResponse>;
  isAvailable(): Promise<boolean>;
}

// ─── Engine base ──────────────────────────────────────────────
export interface EngineContext {
  taskId: string | null;
  emit(source: ActivitySource, phase: ActivityPhase, status: ActivityStatus, message: string, metadata?: Record<string, unknown>): void;
  modelAgents: unknown;     // typed later, avoid cyclic import
}

export interface EngineResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  elapsedMs: number;
}
