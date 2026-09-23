export interface ProjectMetrics {
  goalCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  activeAgentCount: number;
  ledgerEntryCount: number;
  lastActivityAt: string;  // ISO
}
export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  repoUrl?: string;
  localPath?: string;
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
  archived: boolean;
  metrics: ProjectMetrics;
}
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export interface Goal {
  id: string;
  projectId: string;
  title: string;
  description: string;
  constraints: string[];
  priority: Priority;
  status: 'draft' | 'planning' | 'active' | 'blocked' | 'done' | 'abandoned';
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
  taskIds: string[];
  createdBy: 'ceo' | 'system';
}
export type TaskStatus =
  | 'backlog' | 'ready' | 'in_progress'
  | 'review' | 'blocked' | 'done' | 'failed';
export interface Task {
  id: string;
  projectId: string;
  goalId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedAgentId?: string;
  dependsOn: string[];
  skillRequirements: string[];
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
  startedAt?: string;  // ISO
  completedAt?: string;  // ISO
  attempts: number;
  maxAttempts: number;
  lastLedgerRef?: string;
  executionLogIds: string[];
}
export type AgentRole =
  | 'ceo' | 'architect' | 'builder'
  | 'reviewer' | 'chaos_monkey' | 'scout' | 'librarian';
export interface AgentStats {
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskDurationMs: number;
  totalTokensUsed: number;
}
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  persona: string;
  skills: string[];
  status: 'idle' | 'busy' | 'paused' | 'offline';
  currentTaskId?: string;
  maxConcurrency: number;
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
  stats: AgentStats;
}
export type LedgerKind =
  // Curated decision kinds
  | 'decision' | 'schema_change' | 'prompt_change'
  | 'deploy' | 'bug' | 'pivot' | 'omega_action'
  | 'compliance_review' | 'skill_install'
  | 'skill_remove' | 'agent_action'
  // Sovereign-core audit trail kinds (real truth ledger)
  | 'task_received' | 'task_completed' | 'task_failed'
  | 'command_executed' | 'command_blocked'
  | 'file_read' | 'file_written' | 'file_blocked'
  | 'process_inspected'
  | 'workflow_started' | 'workflow_completed' | 'workflow_failed'
  | 'policy_denied' | 'error' | 'health_check'
  | 'server_start' | 'server_stop';
export interface LedgerEntry {
  id: string;
  projectId?: string;
  taskId?: string;
  agentId?: string;
  kind: LedgerKind;
  title: string;
  body: string;
  refs: string[];
  tags: string[];
  createdAt: string;  // ISO
}
export type AuditEntryType =
  | 'TASK_RECEIVED' | 'TASK_COMPLETED' | 'TASK_FAILED'
  | 'COMMAND_EXECUTED' | 'COMMAND_BLOCKED'
  | 'FILE_READ' | 'FILE_WRITTEN' | 'FILE_BLOCKED'
  | 'PROCESS_INSPECTED'
  | 'WORKFLOW_STARTED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED'
  | 'POLICY_DENIED' | 'ERROR' | 'HEALTH_CHECK'
  | 'SERVER_START' | 'SERVER_STOP';

// Mirrors sovereign-core's ledger shape (src/ledger/models/LedgerEntry.ts).
// Distinct from LedgerEntry, which is the curated decision log.
export interface LedgerAuditEntry {
  id: string;
  createdAt: string;  // ISO
  type: AuditEntryType;
  source: string;
  correlationId?: string;
  tags: string[];
  payload: Record<string, unknown>;
  prevHash: string | null;
  hash: string;
}

export interface LedgerAuditQueryResult {
  ok: true;
  entries: LedgerAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ComplianceReview {
  id: string;
  taskId: string;
  originalCommand: string;
  verdict: 'clear' | 'needs_clarification' | 'conflicts_with_ledger' | 'high_risk';
  concerns: string[];
  suggestedAlternatives: string[];
  followUpQuestions: string[];
  createdAt: string;  // ISO
}

// ── System Power (mirrors backend packages/core/src/system-power) ───

export interface SystemPowerHostInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
}

export interface SystemPowerProcessInfo {
  pid: number;
  cpuCount: number;
  loadAvg: [number, number, number];
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
}

export interface SystemPowerSystemInfo {
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  usedMemoryPercent: number;
}

export interface SystemPowerToggles {
  accelEnabled: boolean;
  deepSim: boolean;
}

export type SystemPowerToggleKey = keyof SystemPowerToggles;

export interface SystemPowerStatus {
  host: SystemPowerHostInfo;
  process: SystemPowerProcessInfo;
  system: SystemPowerSystemInfo;
  toggles: SystemPowerToggles;
  ledgerEntryCount: number;
  updatedAt: string;
}
