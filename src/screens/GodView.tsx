import { useEffect, useState } from 'react';
import { Folder, Check } from 'lucide-react';
import { useFactory } from '@/store/FactoryContext';
import { api } from '@/services/api';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusIndicator } from '@/components/StatusIndicator';
import { PillBadge } from '@/components/PillBadge';
import type { Project, ProjectStatus } from '@/types';

const statusMap: Record<ProjectStatus, 'online' | 'idle' | 'error'> = {
  active: 'online',
  idle: 'idle',
  error: 'error',
  archived: 'idle',
};

export function GodView() {
  const { projects, currentProject, setCurrentProject, refreshProjects } = useFactory();
  const [list, setList] = useState<Project[]>(projects);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    setList(projects);
  }, [projects]);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin p-5 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-text leading-tight">God View</h1>
        <p className="text-[13px] text-textSecondary mt-1">Select and manage active factory projects</p>
      </div>

      <div className="mb-6">
        <SectionHeader
          title="Current Focus"
          subtitle="This project drives data on other screens"
        />
        {currentProject ? (
          <div className="p-5 rounded-lg bg-accentSoft border border-accent/20 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-5 h-5 text-accent" />
              <span className="text-[18px] font-semibold text-text">{currentProject.name}</span>
              <Check className="w-4 h-4 text-accent ml-auto" />
            </div>
            <p className="text-[14px] text-textSecondary mb-3">{currentProject.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <PillBadge label={`${currentProject.agentCount} agents`} variant="accent" />
              <PillBadge label={`${currentProject.taskThroughput} t/h`} />
              {currentProject.tags.map((t) => (
                <PillBadge key={t} label={t} />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-md bg-surfaceSunken text-center">
            <p className="text-[14px] text-textTertiary">No project selected.</p>
          </div>
        )}
      </div>

      <div className="flex-1">
        <SectionHeader title="All Projects" subtitle={`${list.length} total`} />
        <div className="flex flex-col gap-2">
          {list.map((p) => {
            const isActive = currentProject?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setCurrentProject(p)}
                className={`text-left p-4 rounded-md border transition-all ${
                  isActive
                    ? 'border-accent bg-accentSoft shadow-soft'
                    : 'border-border bg-surface hover:shadow-soft hover:border-borderStrong'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-textTertiary" />
                    <span className="text-[15px] font-semibold text-text">{p.name}</span>
                  </div>
                  <StatusIndicator status={statusMap[p.status]} showLabel />
                </div>
                <p className="text-[13px] text-textSecondary mb-2">{p.description}</p>
                <div className="flex items-center gap-3 text-[12px] text-textTertiary">
                  <span>{p.agentCount} agents</span>
                  <span>{p.taskThroughput} t/h</span>
                  <span>{new Date(p.lastActivity).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}
