import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { Project, Agent, Task, LedgerEntry, LedgerAuditEntry } from '../types';

interface FactoryState {
  projects: Project[];
  activeProjectId: string | null;
  agents: Agent[];
  tasks: Task[];
  ledger: LedgerEntry[];
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadTasks: (projectId?: string) => Promise<void>;
  loadLedger: (projectId?: string) => Promise<void>;
  setActiveProject: (id: string) => void;
  refreshAll: () => Promise<void>;
}

const Ctx = createContext<FactoryState | null>(null);

/**
 * Map a canonical sovereign-core audit entry (LedgerAuditEntry) into the
 * curated LedgerEntry shape the screens render. No data invented — payload
 * is stringified as body, correlationId becomes the single ref, type is
 * lowercased into kind.
 */
function auditToEntry(a: LedgerAuditEntry): LedgerEntry {
  const kind = (a.type.toLowerCase() as LedgerEntry['kind']);
  const payload = a.payload ?? {};
  const title = a.type.replace(/_/g, ' ').toLowerCase();
  const body = JSON.stringify(payload).slice(0, 400);
  const p = payload as Record<string, unknown>;
  return {
    id: a.id,
    projectId: typeof p.projectId === 'string' ? p.projectId : undefined,
    taskId: typeof p.taskId === 'string' ? p.taskId : undefined,
    agentId: typeof p.agentId === 'string' ? p.agentId : undefined,
    kind,
    title,
    body,
    refs: a.correlationId ? [a.correlationId] : [],
    tags: a.tags,
    createdAt: a.createdAt,
  };
}

export function FactoryProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const list = await api.listProjects();
      setProjects(list);
      if (!activeProjectId && list.length > 0) setActiveProjectId(list[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    }
  }, [activeProjectId]);

  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      setAgents(await api.listAgents());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load agents');
    }
  }, []);

  const loadTasks = useCallback(async (projectId?: string) => {
    try {
      setError(null);
      setTasks(await api.listTasks(projectId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    }
  }, []);

  const loadLedger = useCallback(async (_projectId?: string) => {
    try {
      setError(null);
      const audit = await api.listLedgerAudit(200);
      setLedger(audit.map(auditToEntry));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ledger');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProjects(), loadAgents(), loadLedger()]);
    setLoading(false);
  }, [loadProjects, loadAgents, loadLedger]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const value: FactoryState = {
    projects, activeProjectId, agents, tasks, ledger, loading, error,
    loadProjects, loadAgents, loadTasks, loadLedger,
    setActiveProject: setActiveProjectId,
    refreshAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFactory(): FactoryState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFactory must be used inside FactoryProvider');
  return v;
}
