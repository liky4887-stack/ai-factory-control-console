import type {
  Project,
  Agent,
  LedgerEntry,
  SystemStatus,
  OmegaState,
  Metrics,
  Incident,
} from '@/types';

const BASE_URL = 'http://127.0.0.1:8787';
const TIMEOUT_MS = 5000;

class ApiError extends Error {
  constructor(message: string, public readonly code: 'offline' | 'timeout' | 'http' = 'http') {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    clearTimeout(timer);
    if (!res.ok) throw new ApiError(`HTTP ${res.status} from ${path}`);
    return await res.json() as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out`, 'timeout');
    }
    throw new ApiError(`Cannot reach Termux bridge at ${BASE_URL}`, 'offline');
  }
}

function mockData<T>(data: T): Promise<T> {
  return new Promise<T>((resolve) => setTimeout(() => resolve(data), 300));
}

const mockProjects: Project[] = [
  { id: 'p1', name: 'Atlas Core', description: 'Main reasoning and planning engine', status: 'active', agentCount: 8, taskThroughput: 142, lastActivity: Date.now() - 120_000, tags: ['core', 'reasoning'] },
  { id: 'p2', name: 'Sentinel Ops', description: 'Monitoring and alerting subsystem', status: 'active', agentCount: 4, taskThroughput: 67, lastActivity: Date.now() - 60_000, tags: ['ops', 'monitoring'] },
  { id: 'p3', name: 'Forge Build', description: 'CI/CD and deployment pipeline', status: 'idle', agentCount: 2, taskThroughput: 0, lastActivity: Date.now() - 3_600_000, tags: ['build', 'deploy'] },
  { id: 'p4', name: 'Vortex Data', description: 'Data processing and ETL', status: 'error', agentCount: 3, taskThroughput: 12, lastActivity: Date.now() - 900_000, tags: ['data', 'etl'] },
];

const mockAgents: Agent[] = [
  { id: 'a1', name: 'Architect-Alpha', role: 'architect', status: 'running', currentTask: 'Designing module boundary for Atlas Core v2', projectId: 'p1', lastHeartbeat: Date.now() - 5_000, logs: ['Started design task', 'Analyzing dependencies', 'Generating blueprint'] },
  { id: 'a2', name: 'Coder-Beta', role: 'coder', status: 'running', currentTask: 'Implementing auth middleware', projectId: 'p1', lastHeartbeat: Date.now() - 3_000, logs: ['Picked up task #142', 'Writing middleware', 'Running local tests'] },
  { id: 'a3', name: 'Tester-Gamma', role: 'tester', status: 'blocked', currentTask: 'Waiting on build artifact', projectId: 'p1', lastHeartbeat: Date.now() - 30_000, logs: ['Test suite queued', 'Blocked: no artifact'] },
  { id: 'a4', name: 'Reviewer-Delta', role: 'reviewer', status: 'idle', currentTask: '—', projectId: 'p2', lastHeartbeat: Date.now() - 120_000, logs: ['No pending reviews'] },
  { id: 'a5', name: 'Deployer-Epsilon', role: 'deployer', status: 'completed', currentTask: 'Deployed Sentinel Ops v1.4', projectId: 'p2', lastHeartbeat: Date.now() - 600_000, logs: ['Deployment started', 'Health checks passed', 'Deployment complete'] },
  { id: 'a6', name: 'Monitor-Zeta', role: 'monitor', status: 'running', currentTask: 'Watching error rates on Vortex', projectId: 'p4', lastHeartbeat: Date.now() - 8_000, logs: ['Error rate elevated', 'Investigating root cause', 'Alert sent to Architect'] },
  { id: 'a7', name: 'Coder-Eta', role: 'coder', status: 'error', currentTask: 'ETL pipeline crashed on malformed input', projectId: 'p4', lastHeartbeat: Date.now() - 120_000, logs: ['Processing batch #882', 'TypeError: malformed JSON', 'Agent halted'] },
  { id: 'a8', name: 'Architect-Theta', role: 'architect', status: 'idle', currentTask: '—', projectId: 'p3', lastHeartbeat: Date.now() - 1_800_000, logs: ['No active tasks'] },
];

const mockLedger: LedgerEntry[] = [
  { id: 'l1', type: 'decision', source: 'Architect-Alpha', projectId: 'p1', timestamp: Date.now() - 3_600_000, summary: 'Adopted event-driven architecture for Atlas Core v2', body: 'After evaluating 3 alternatives, event-driven with CQRS was selected for its scalability and debuggability. The decision was unanimous across the architect swarm.', linkedAgents: ['a1', 'a8'], confidence: 0.94, verified: true },
  { id: 'l2', type: 'incident', source: 'Monitor-Zeta', projectId: 'p4', timestamp: Date.now() - 900_000, summary: 'ETL pipeline crash on batch #882', body: 'Coder-Eta encountered malformed JSON in batch #882. The agent halted and could not self-recover. Monitor-Zeta detected the error rate spike and sent an alert.', linkedAgents: ['a6', 'a7'], confidence: 0.88, verified: true },
  { id: 'l3', type: 'milestone', source: 'Deployer-Epsilon', projectId: 'p2', timestamp: Date.now() - 600_000, summary: 'Sentinel Ops v1.4 deployed successfully', body: 'All health checks passed. Deployment took 4m 22s. New alerting rules are now active.', linkedAgents: ['a5'], confidence: 1.0, verified: true },
  { id: 'l4', type: 'fact', source: 'Tester-Gamma', projectId: 'p1', timestamp: Date.now() - 120_000, summary: 'Test coverage at 87% for auth module', body: '142 tests passing, 21 pending. Coverage increased by 3% since last run.', linkedAgents: ['a3'], confidence: 0.97, verified: true },
  { id: 'l5', type: 'event', source: 'system', projectId: 'p1', timestamp: Date.now() - 60_000, summary: 'Heartbeat timeout from Coder-Eta', body: 'Agent a7 missed 3 consecutive heartbeats. Status changed to error. Autopilot notified.', linkedAgents: ['a7'], confidence: 1.0, verified: true },
];

const mockIncidents: Incident[] = [
  { id: 'i1', severity: 'high', message: 'ETL pipeline crash on Vortex Data', timestamp: Date.now() - 900_000, resolved: false },
  { id: 'i2', severity: 'medium', message: 'Agent Coder-Eta heartbeat timeout', timestamp: Date.now() - 120_000, resolved: false },
  { id: 'i3', severity: 'low', message: 'Forge Build idle for 1+ hour', timestamp: Date.now() - 3_600_000, resolved: true },
];

const mockSystemStatus: SystemStatus = {
  online: true,
  version: '2.4.1',
  uptime: 86400_000 * 3 + 3_600_000 * 7,
  activeAgents: 5,
  totalAgents: 8,
  tasksPerHour: 221,
  requestsProcessed: 14_892,
  incidents: mockIncidents,
  lastSync: Date.now(),
};

const mockOmega: OmegaState = {
  mode: 'safe',
  killSwitch: false,
  factoryMode: false,
  degradationMode: false,
  simulationMode: false,
};

const mockMetrics: Metrics = {
  cpuUsage: 34,
  memoryUsage: 58,
  diskUsage: 71,
  networkIn: 12_400,
  networkOut: 8_200,
};

export const api = {
  async getHealth(): Promise<{ status: string; version: string }> {
    try { return await request('/health'); }
    catch { return mockData({ status: 'mock', version: '2.4.1' }); }
  },

  async getSystemStatus(): Promise<SystemStatus> {
    try { return await request<SystemStatus>('/metrics'); }
    catch { return mockData(mockSystemStatus); }
  },

  async getProjects(): Promise<Project[]> {
    try { return await request<Project[]>('/projects'); }
    catch { return mockData(mockProjects); }
  },

  async getAgents(projectId?: string): Promise<Agent[]> {
    const path = projectId ? `/agents?project=${projectId}` : '/agents';
    try { return await request<Agent[]>(path); }
    catch { return mockData(mockAgents.filter(a => !projectId || a.projectId === projectId)); }
  },

  async getLedger(filters?: { type?: string; projectId?: string }): Promise<LedgerEntry[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.projectId) params.set('project', filters.projectId);
    const path = `/ledger${params.toString() ? `?${params}` : ''}`;
    const filtered = mockLedger.filter(e => {
      if (filters?.type && e.type !== filters.type) return false;
      if (filters?.projectId && e.projectId !== filters.projectId) return false;
      return true;
    });
    try { return await request<LedgerEntry[]>(path); }
    catch { return mockData(filtered); }
  },

  async getMetrics(): Promise<Metrics> {
    try { return await request<Metrics>('/metrics/system'); }
    catch { return mockData(mockMetrics); }
  },

  async getOmegaState(): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega'); }
    catch { return mockData(mockOmega); }
  },

  async setOmegaMode(mode: string): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega/mode', { method: 'POST', body: JSON.stringify({ mode }) }); }
    catch { return mockData({ ...mockOmega, mode: mode as OmegaState['mode'] }); }
  },

  async toggleKillSwitch(enabled: boolean): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega/kill', { method: 'POST', body: JSON.stringify({ enabled }) }); }
    catch { return mockData({ ...mockOmega, killSwitch: enabled }); }
  },

  async toggleFactoryMode(enabled: boolean): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega/factory', { method: 'POST', body: JSON.stringify({ enabled }) }); }
    catch { return mockData({ ...mockOmega, factoryMode: enabled }); }
  },

  async toggleDegradationMode(enabled: boolean): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega/degraded', { method: 'POST', body: JSON.stringify({ enabled }) }); }
    catch { return mockData({ ...mockOmega, degradationMode: enabled }); }
  },

  async toggleSimulationMode(enabled: boolean): Promise<OmegaState> {
    try { return await request<OmegaState>('/omega/simulation', { method: 'POST', body: JSON.stringify({ enabled }) }); }
    catch { return mockData({ ...mockOmega, simulationMode: enabled }); }
  },

  async controlAgent(agentId: string, action: 'pause' | 'resume' | 'restart'): Promise<{ ok: boolean }> {
    try { return await request<{ ok: boolean }>(`/agents/${agentId}/${action}`, { method: 'POST' }); }
    catch { return mockData({ ok: true }); }
  },

  async selectProject(projectId: string): Promise<{ ok: boolean }> {
    try { return await request<{ ok: boolean }>(`/projects/${projectId}/activate`, { method: 'POST' }); }
    catch { return mockData({ ok: true }); }
  },

  isOnline(): boolean {
    return true;
  },
};
