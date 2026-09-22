import type { Incident } from '@/types';
import { PillBadge } from './PillBadge';

const severityVariant: Record<Incident['severity'], 'default' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-surface border border-border">
      <PillBadge
        label={incident.severity.toUpperCase()}
        variant={severityVariant[incident.severity]}
      />
      <span className="flex-1 text-[14px] text-text truncate">{incident.message}</span>
      {incident.resolved ? (
        <span className="text-[12px] text-success font-medium">Resolved</span>
      ) : (
        <span className="text-[12px] text-danger font-medium">Active</span>
      )}
    </div>
  );
}
