interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[18px] font-semibold text-text leading-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-textSecondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
