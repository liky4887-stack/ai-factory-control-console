import { useEffect, useState } from 'react';
import { Activity, Cpu, AlertCircle, Zap, Clock, Server } from 'lucide-react';
import { useFactory } from '@/store/FactoryContext';
import { StatCard } from '@/components/StatCard';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusIndicator } from '@/components/StatusIndicator';
import { IncidentRow } from '@/components/IncidentRow';
import { PillBadge } from '@/components/PillBadge';
import type { SystemStatus, Incident } from '@/types';

export function CEODashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { systemStatus, currentProject, lastSync } = useFactory();
  const [status, setStatus] = useState<SystemStatus | null>(systemStatus);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    setStatus(systemStatus);
    setIncidents(systemStatus?.incidents ?? []);
  }, [systemStatus]);

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    return `${days}d ${hours}h`;
  };

  const activeIncidents = incidents.filter((i) => !i.resolved);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin p-5 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-text leading-tight">CEO Dashboard</h1>
            <p className="text-[13px] text-textSecondary mt-1">
              {currentProject ? `Project: ${currentProject.name}` : 'All projects'}
            </p>
          </div>
          <StatusIndicator status={status?.online ? 'online' : 'offline'} pulse={status?.online} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="System Health"
          value={status?.online ? 'Operational' : 'Offline'}
          sublabel={status ? `v${status.version}` : ''}
          icon={<Server className="w-4 h-4" />}
          accent={status?.online ? 'success' : 'danger'}
        />
        <StatCard
          label="Active Agents"
          value={`${status?.activeAgents ?? 0}/${status?.totalAgents ?? 0}`}
          sublabel="across all projects"
          icon={<Activity className="w-4 h-4" />}
          onClick={() => onNavigate('swarm')}
        />
        <StatCard
          label="Tasks / Hour"
          value={status?.tasksPerHour ?? 0}
          sublabel="throughput"
          icon={<Zap className="w-4 h-4" />}
          accent="default"
        />
        <StatCard
          label="Requests Processed"
          value={(status?.requestsProcessed ?? 0).toLocaleString()}
          sublabel="total lifetime"
          icon={<Cpu className="w-4 h-4" />}
        />
      </div>

      <div className="mb-6">
        <SectionHeader
          title="Active Incidents"
          subtitle={`${activeIncidents.length} unresolved`}
          action={
            <PillBadge
              label={activeIncidents.length > 0 ? `${activeIncidents.length} ACTIVE` : 'ALL CLEAR'}
              variant={activeIncidents.length > 0 ? 'danger' : 'success'}
            />
          }
        />
        <div className="flex flex-col gap-2">
          {incidents.length === 0 ? (
            <div className="p-4 rounded-md bg-surfaceSunken text-center">
              <p className="text-[14px] text-textTertiary">No incidents recorded.</p>
            </div>
          ) : (
            incidents.slice(0, 5).map((inc) => <IncidentRow key={inc.id} incident={inc} />)
          )}
        </div>
      </div>

      <div className="mb-6">
        <SectionHeader title="System Info" />
        <div className="p-4 rounded-md bg-surface border border-border shadow-soft">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-textSecondary">Uptime</span>
            <span className="text-[14px] font-medium text-text">{status ? formatUptime(status.uptime) : '—'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-t border-border">
            <span className="text-[13px] text-textSecondary">Last Sync</span>
            <span className="text-[14px] font-medium text-text">
              {new Date(lastSync).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-t border-border">
            <span className="text-[13px] text-textSecondary">Bridge</span>
            <span className="text-[14px] font-mono text-text">127.0.0.1:8787</span>
          </div>
        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}
