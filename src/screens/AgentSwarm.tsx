import { useEffect, useState, useCallback } from 'react';
import { Search, Pause, Play, RotateCw } from 'lucide-react';
import { useFactory } from '@/store/FactoryContext';
import { api } from '@/services/api';
import { SectionHeader } from '@/components/SectionHeader';
import { PillBadge } from '@/components/PillBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { Agent, AgentStatus, AgentRole } from '@/types';

const statusVariant: Record<AgentStatus, 'success' | 'default' | 'warning' | 'danger' | 'accent'> = {
  running: 'success',
  idle: 'default',
  blocked: 'warning',
  completed: 'accent',
  error: 'danger',
};

const statusOrder: AgentStatus[] = ['running', 'blocked', 'idle', 'completed', 'error'];

const roleLabels: Record<AgentRole, string> = {
  architect: 'Architect',
  coder: 'Coder',
  tester: 'Tester',
  reviewer: 'Reviewer',
  deployer: 'Deployer',
  monitor: 'Monitor',
};

export function AgentSwarm() {
  const { currentProject } = useFactory();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all');
  const [selected, setSelected] = useState<Agent | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; agent: Agent } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAgents = useCallback(async () => {
    const a = await api.getAgents(currentProject?.id);
    setAgents(a);
  }, [currentProject]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filtered = agents.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.currentTask.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = statusOrder.map((s) => ({
    status: s,
    items: filtered.filter((a) => a.status === s),
  })).filter((g) => g.items.length > 0);

  const handleAction = async () => {
    if (!confirm) return;
    setBusy(true);
    await api.controlAgent(confirm.agent.id, confirm.action as 'pause' | 'resume' | 'restart');
    setBusy(false);
    setConfirm(null);
    await loadAgents();
    if (selected?.id === confirm.agent.id) {
      setSelected(await api.getAgents().then((all) => all.find((a) => a.id === confirm.agent.id) ?? null));
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-5 pb-3">
        <h1 className="text-[24px] font-bold text-text leading-tight">Agent Swarm</h1>
        <p className="text-[13px] text-textSecondary mt-1">
          {currentProject ? currentProject.name : 'All projects'} — {agents.length} agents
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or tasks…"
            className="w-full h-11 pl-10 pr-4 rounded-md bg-surface border border-border text-[14px] text-text placeholder:text-textTertiary focus:outline-none focus:border-accent focus:shadow-focus transition-all"
          />
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hidden">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${
              filterStatus === 'all' ? 'bg-text text-white' : 'bg-surface border border-border text-textSecondary'
            }`}
          >
            All
          </button>
          {statusOrder.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium capitalize whitespace-nowrap ${
                filterStatus === s ? 'bg-text text-white' : 'bg-surface border border-border text-textSecondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-8">
          <div className="flex flex-col gap-4">
            {grouped.map((group) => (
              <div key={group.status}>
                <SectionHeader
                  title={group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                  subtitle={`${group.items.length} agent${group.items.length !== 1 ? 's' : ''}`}
                />
                <div className="flex flex-col gap-2">
                  {group.items.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelected(agent)}
                      className="text-left p-4 rounded-md bg-surface border border-border shadow-soft hover:shadow-medium hover:border-borderStrong transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold text-text">{agent.name}</span>
                        <PillBadge label={agent.status.toUpperCase()} variant={statusVariant[agent.status]} />
                      </div>
                      <p className="text-[13px] text-textSecondary truncate">{agent.currentTask}</p>
                      <div className="flex items-center gap-3 mt-2 text-[12px] text-textTertiary">
                        <span>{roleLabels[agent.role]}</span>
                        <span>HB {new Date(agent.lastHeartbeat).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[14px] text-textTertiary">No agents match your filters.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 animate-fade-in">
          <button
            onClick={() => setSelected(null)}
            className="text-[13px] text-accent font-medium mb-4 hover:underline"
          >
            ← Back to swarm
          </button>

          <div className="p-5 rounded-lg bg-surface border border-border shadow-soft mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-semibold text-text">{selected.name}</h2>
              <PillBadge label={selected.status.toUpperCase()} variant={statusVariant[selected.status]} />
            </div>
            <div className="flex items-center gap-3 text-[13px] text-textSecondary mb-4">
              <PillBadge label={roleLabels[selected.role]} variant="accent" />
              <span>Last heartbeat: {new Date(selected.lastHeartbeat).toLocaleTimeString()}</span>
            </div>
            <p className="text-[14px] text-text mb-1 font-medium">Current Task</p>
            <p className="text-[14px] text-textSecondary">{selected.currentTask}</p>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setConfirm({ action: 'pause', agent: selected })}
              className="flex-1 h-11 rounded-md bg-surface border border-border text-text font-medium text-[13px] flex items-center justify-center gap-1.5 hover:bg-surfaceSunken transition-colors"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            <button
              onClick={() => setConfirm({ action: 'resume', agent: selected })}
              className="flex-1 h-11 rounded-md bg-surface border border-border text-text font-medium text-[13px] flex items-center justify-center gap-1.5 hover:bg-surfaceSunken transition-colors"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
            <button
              onClick={() => setConfirm({ action: 'restart', agent: selected })}
              className="flex-1 h-11 rounded-md bg-surface border border-border text-text font-medium text-[13px] flex items-center justify-center gap-1.5 hover:bg-surfaceSunken transition-colors"
            >
              <RotateCw className="w-4 h-4" /> Restart
            </button>
          </div>

          <SectionHeader title="Agent Logs" />
          <div className="p-4 rounded-md bg-code shadow-soft overflow-x-auto">
            {selected.logs.map((log, i) => (
              <div key={i} className="font-mono text-[13px] text-codeText leading-relaxed">
                <span className="text-textTertiary">[{String(i + 1).padStart(2, '0')}]</span> {log}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={`Confirm ${confirm?.action ?? ''}`}
        message={`Are you sure you want to ${confirm?.action} agent ${confirm?.agent.name}? This action will be sent to the Termux bridge.`}
        confirmLabel={confirm?.action ? confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1) : ''}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
        danger={confirm?.action === 'restart'}
      />
    </div>
  );
}
