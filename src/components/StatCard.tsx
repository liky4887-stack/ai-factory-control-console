import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const accentColors = {
  default: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatCard({ label, value, sublabel, icon, accent = 'default', onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left p-5 rounded-lg bg-surface border border-border shadow-soft transition-all ${
        onClick ? 'hover:shadow-medium hover:border-borderStrong cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-medium uppercase tracking-wider text-textTertiary">{label}</span>
        {icon && <span className="text-textTertiary">{icon}</span>}
      </div>
      <div className={`text-[28px] font-bold leading-none ${accentColors[accent]}`}>{value}</div>
      {sublabel && <p className="text-[13px] text-textSecondary mt-2">{sublabel}</p>}
    </button>
  );
}
