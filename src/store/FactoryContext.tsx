import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Project, SystemStatus, OmegaState } from '@/types';
import { api } from '@/services/api';

interface FactoryStore {
  currentProject: Project | null;
  projects: Project[];
  systemStatus: SystemStatus | null;
  omegaState: OmegaState | null;
  online: boolean;
  lastSync: number;
  setCurrentProject: (p: Project) => void;
  refreshProjects: () => Promise<void>;
  refreshSystemStatus: () => Promise<void>;
  refreshOmega: () => Promise<void>;
  setOnline: (v: boolean) => void;
}

const FactoryContext = createContext<FactoryStore | null>(null);

export function FactoryProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [omegaState, setOmegaState] = useState<OmegaState | null>(null);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(Date.now());

  const refreshProjects = useCallback(async () => {
    try {
      const ps = await api.getProjects();
      setProjects(ps);
      setOnline(true);
      if (!currentProject && ps.length > 0) {
        setCurrentProjectState(ps[0]);
      }
    } catch {
      setOnline(false);
    }
  }, [currentProject]);

  const refreshSystemStatus = useCallback(async () => {
    try {
      const s = await api.getSystemStatus();
      setSystemStatus(s);
      setOnline(true);
      setLastSync(Date.now());
    } catch {
      setOnline(false);
    }
  }, []);

  const refreshOmega = useCallback(async () => {
    try {
      const o = await api.getOmegaState();
      setOmegaState(o);
    } catch {
      // silent fail for omega
    }
  }, []);

  const setCurrentProject = useCallback((p: Project) => {
    setCurrentProjectState(p);
    api.selectProject(p.id).catch(() => {});
  }, []);

  useEffect(() => {
    refreshProjects();
    refreshSystemStatus();
    refreshOmega();
    const interval = setInterval(() => {
      refreshSystemStatus();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refreshProjects, refreshSystemStatus, refreshOmega]);

  return (
    <FactoryContext.Provider
      value={{
        currentProject,
        projects,
        systemStatus,
        omegaState,
        online,
        lastSync,
        setCurrentProject,
        refreshProjects,
        refreshSystemStatus,
        refreshOmega,
        setOnline,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory(): FactoryStore {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactory must be used within FactoryProvider');
  return ctx;
}
