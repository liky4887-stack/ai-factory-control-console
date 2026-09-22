export type ProjectStatus = 'active' | 'idle' | 'error' | 'archived';
export type AgentStatus = 'idle' | 'running' | 'blocked' | 'completed' | 'error';
export type AgentRole = 'architect' | 'coder' | 'tester' | 'reviewer' | 'deployer' | 'monitor';
export type LedgerEntryType = 'decision' | 'event' | 'fact' | 'incident' | 'milestone';
export type OmegaMode = 'safe' | 'armed' | 'factory' | 'degraded' | 'simulation';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  agentCount: number;
  taskThroughput: number;
  lastActivity: number;
  tags: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask: string;
  projectId: string;
  lastHeartbeat: number;
  logs: string[];
}

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  source: string;
  projectId: string;
  timestamp: number;
  summary: string;
  body: string;
  linkedAgents: string[];
  confidence: number;
  verified: boolean;
}

export interface SystemStatus {
  online: boolean;
  version: string;
  uptime: number;
  activeAgents: number;
  totalAgents: number;
  tasksPerHour: number;
  requestsProcessed: number;
  incidents: Incident[];
  lastSync: number;
}

export interface Incident {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface OmegaState {
  mode: OmegaMode;
  killSwitch: boolean;
  factoryMode: boolean;
  degradationMode: boolean;
  simulationMode: boolean;
}

export interface Metrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
}
