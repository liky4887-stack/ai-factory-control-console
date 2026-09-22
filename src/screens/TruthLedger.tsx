import { useEffect, useState, useCallback } from 'react';
import { Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useFactory } from '@/store/FactoryContext';
import { api } from '@/services/api';
import { SectionHeader } from '@/components/SectionHeader';
import { PillBadge } from '@/components/PillBadge';
import type { LedgerEntry, LedgerEntryType } from '@/types';

const typeVariant: Record<LedgerEntryType, 'accent' | 'warning' | 'danger' | 'success' | 'default'> = {
  decision: 'accent',
  event: 'default',
  fact: 'success',
  incident: 'danger',
  milestone: 'warning',
};

const allTypes: (LedgerEntryType | 'all')[] = ['all', 'decision', 'event', 'fact', 'incident', 'milestone'];

export function TruthLedger() {
  const { currentProject } = useFactory();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<LedgerEntryType | 'all'>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const load = useCallback(async () => {
    const e = await api.getLedger({
      type: filterType !== 'all' ? filterType : undefined,
      projectId: currentProject?.id,
    });
    setEntries(e);
  }, [filterType, currentProject]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = entries.filter((e) => {
    if (search && !e.summary.toLowerCase().includes(search.toLowerCase()) && !e.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selected) {
    return (
      <div className="flex flex-col h-full overflow-y-auto scrollbar-thin p-5 animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="text-[13px] text-accent font-medium mb-4 hover:underline"
        >
          ← Back to ledger
        </button>

        <div className="p-5 rounded-lg bg-surface border border-border shadow-soft mb-4">
          <div className="flex items-center gap-2 mb-3">
            <PillBadge label={selected.type.toUpperCase()} variant={typeVariant[selected.type]} />
            {selected.verified ? (
              <span className="flex items-center gap-1 text-[12px] text-success font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[12px] text-warning font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Unverified
              </span>
            )}
          </div>
          <h2 className="text-[18px] font-semibold text-text mb-2">{selected.summary}</h2>
          <p className="text-[14px] text-textSecondary leading-relaxed">{selected.body}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-4 rounded-md bg-surface border border-border">
            <p className="text-[12px] text-textTertiary uppercase tracking-wider mb-1">Source</p>
            <p className="text-[14px] font-medium text-text">{selected.source}</p>
          </div>
          <div className="p-4 rounded-md bg-surface border border-border">
            <p className="text-[12px] text-textTertiary uppercase tracking-wider mb-1">Timestamp</p>
            <p className="text-[14px] font-medium text-text">{new Date(selected.timestamp).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-md bg-surface border border-border">
            <p className="text-[12px] text-textTertiary uppercase tracking-wider mb-1">Confidence</p>
            <p className="text-[14px] font-medium text-text">{(selected.confidence * 100).toFixed(0)}%</p>
          </div>
          <div className="p-4 rounded-md bg-surface border border-border">
            <p className="text-[12px] text-textTertiary uppercase tracking-wider mb-1">Linked Agents</p>
            <p className="text-[14px] font-medium text-text">{selected.linkedAgents.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-5 pb-3">
        <h1 className="text-[24px] font-bold text-text leading-tight">Truth Ledger</h1>
        <p className="text-[13px] text-textSecondary mt-1">
          {currentProject ? currentProject.name : 'All projects'} — {filtered.length} entries
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search summaries or sources…"
            className="w-full h-11 pl-10 pr-4 rounded-md bg-surface border border-border text-[14px] text-text placeholder:text-textTertiary focus:outline-none focus:border-accent focus:shadow-focus transition-all"
          />
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hidden">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium capitalize whitespace-nowrap ${
                filterType === t ? 'bg-text text-white' : 'bg-surface border border-border text-textSecondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-8">
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="text-left p-4 rounded-md bg-surface border border-border shadow-soft hover:shadow-medium hover:border-borderStrong transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <PillBadge label={entry.type.toUpperCase()} variant={typeVariant[entry.type]} />
                <span className="text-[12px] text-textTertiary">{entry.source}</span>
                <span className="text-[12px] text-textTertiary ml-auto">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[14px] font-medium text-text">{entry.summary}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[12px] text-textTertiary">
                  Confidence: {(entry.confidence * 100).toFixed(0)}%
                </span>
                {entry.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[14px] text-textTertiary">No ledger entries match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
