type Status = 'online' | 'offline' | 'warning' | 'error' | 'idle';

const config: Record<Status, { dot: string; label: string; text: string }> = {
  online: { dot: 'bg-success', label: 'Online', text: 'text-success' },
  offline: { dot: 'bg-textTertiary', label: 'Offline', text: 'text-textTertiary' },
  warning: { dot: 'bg-warning', label: 'Warning', text: 'text-warning' },
  error: { dot: 'bg-danger', label: 'Error', text: 'text-danger' },
  idle: { dot: 'bg-textTertiary', label: 'Idle', text: 'text-textTertiary' },
};

export function StatusIndicator({
  status,
  showLabel = true,
  pulse = false,
}: {
  status: Status;
  showLabel?: boolean;
  pulse?: boolean;
}) {
  const c = config[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        {pulse && (
          <span className={`absolute w-2 h-2 rounded-full ${c.dot} animate-pulse-ring`} />
        )}
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      </div>
      {showLabel && <span className={`text-[12px] font-medium ${c.text}`}>{c.label}</span>}
    </div>
  );
}
