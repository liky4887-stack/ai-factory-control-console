type PillVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'omega';

const variants: Record<PillVariant, string> = {
  default: 'bg-surfaceSunken text-textSecondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accentSoft text-accent',
  omega: 'bg-omegaSoft text-omega',
};

export function PillBadge({ label, variant = 'default' }: { label: string; variant?: PillVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${variants[variant]}`}>
      {label}
    </span>
  );
}
