import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Project, Goal, Task, Agent, LedgerEntry, ComplianceReview,
} from '../types';

const BRIDGE_URL = 'http://127.0.0.1:8787';
const HANDSHAKE_KEY = 'ghost_handshake';

let cachedToken: string | null = null;

async function token(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(HANDSHAKE_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setHandshake(value: string): Promise<void> {
  cachedToken = value.trim();
  await AsyncStorage.setItem(HANDSHAKE_KEY, cachedToken);
}

export async function getHandshake(): Promise<string | null> {
  return token();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const t = await token();
  if (t) headers['X-Ghost-Handshake'] = t;
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...((init && init.headers) as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${path} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  status: () => request<{ ok: true; nodeVersion: string; activeModelTypes: string[] }>(
    '/api/bridge/status'
  ),

  listProjects: async (): Promise<Project[]> => {
    const r = await request<{ ok: true; projects: Project[] }>('/api/bridge/projects');
    return r.projects;
  },

  getProject: async (id: string): Promise<Project> => {
    const r = await request<{ ok: true; project: Project }>(`/api/bridge/projects/${id}`);
    return r.project;
  },

  createProject: async (input: { name: string; slug: string; description: string }): Promise<Project> => {
    const r = await request<{ ok: true; project: Project }>('/api/bridge/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return r.project;
  },

  listGoals: async (projectId: string): Promise<Goal[]> => {
    const r = await request<{ ok: true; goals: Goal[] }>(`/api/bridge/projects/${projectId}/goals`);
    return r.goals;
  },

  createGoal: async (
    projectId: string,
    input: { title: string; description: string; constraints: string[]; priority: Goal['priority'] }
  ): Promise<Goal> => {
    const r = await request<{ ok: true; goal: Goal }>(
      `/api/bridge/projects/${projectId}/goals`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return r.goal;
  },

  listTasks: async (projectId?: string): Promise<Task[]> => {
    const q = projectId ? `?project=${projectId}` : '';
    const r = await request<{ ok: true; tasks: Task[] }>(`/api/bridge/tasks${q}`);
    return r.tasks;
  },

  getTask: async (id: string): Promise<Task> => {
    const r = await request<{ ok: true; task: Task }>(`/api/bridge/tasks/${id}`);
    return r.task;
  },

  retryTask: async (id: string): Promise<Task> => {
    const r = await request<{ ok: true; task: Task }>(`/api/bridge/tasks/${id}/retry`, {
      method: 'POST',
      body: '{}',
    });
    return r.task;
  },

  listAgents: async (): Promise<Agent[]> => {
    const r = await request<{ ok: true; agents: Agent[] }>('/api/bridge/agents');
    return r.agents;
  },

  pauseAgent: async (id: string): Promise<Agent> => {
    const r = await request<{ ok: true; agent: Agent }>(`/api/bridge/agents/${id}/pause`, {
      method: 'POST',
      body: '{}',
    });
    return r.agent;
  },

  resumeAgent: async (id: string): Promise<Agent> => {
    const r = await request<{ ok: true; agent: Agent }>(`/api/bridge/agents/${id}/resume`, {
      method: 'POST',
      body: '{}',
    });
    return r.agent;
  },

  listLedger: async (projectId?: string): Promise<LedgerEntry[]> => {
    const q = projectId ? `?project=${projectId}` : '';
    const r = await request<{ ok: true; entries: LedgerEntry[] }>(`/api/bridge/ledger${q}`);
    return r.entries;
  },

  reviewCommand: async (taskId: string, command: string): Promise<ComplianceReview> => {
    const r = await request<{ ok: true; review: ComplianceReview }>(
      '/api/bridge/compliance/review',
      { method: 'POST', body: JSON.stringify({ taskId, command }) }
    );
    return r.review;
  },

  fireOmega: async (input: {
    taskId: string;
    agentId: string;
    command: string;
    omegaAcknowledged: boolean;
    omegaReason: string;
  }): Promise<{ executionLogId: string; ledgerEntryId: string }> => {
    const r = await request<{ ok: true; executionLogId: string; ledgerEntryId: string }>(
      '/api/bridge/omega/execute',
      { method: 'POST', body: JSON.stringify(input) }
    );
    return { executionLogId: r.executionLogId, ledgerEntryId: r.ledgerEntryId };
  },
};
