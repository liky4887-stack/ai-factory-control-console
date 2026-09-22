export interface ProjectMetrics {
  goalCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  activeAgentCount: number;
  ledgerEntryCount: number;
  lastActivityAt: number;
}
export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  repoUrl?: string;
  localPath?: string;
  createdAt: number;
  updatedAt: number;
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
  createdAt: number;
  updatedAt: number;
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
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
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
  createdAt: number;
  updatedAt: number;
  stats: AgentStats;
}
export type LedgerKind =
  | 'decision' | 'schema_change' | 'prompt_change'
  | 'deploy' | 'bug' | 'pivot' | 'omega_action'
  | 'compliance_review' | 'skill_install'
  | 'skill_remove' | 'agent_action';
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
  createdAt: number;
}
export interface ComplianceReview {
  id: string;
  taskId: string;
  originalCommand: string;
  verdict: 'clear' | 'needs_clarification' | 'conflicts_with_ledger' | 'high_risk';
  concerns: string[];
  suggestedAlternatives: string[];
  followUpQuestions: string[];
  createdAt: number;
}
