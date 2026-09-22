import { useEffect, useState } from 'react';
import { Power, ToggleLeft, ToggleRight, AlertOctagon } from 'lucide-react';
import { useFactory } from '@/store/FactoryContext';
import { api } from '@/services/api';
import { SectionHeader } from '@/components/SectionHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PillBadge } from '@/components/PillBadge';
import type { OmegaState, OmegaMode } from '@/types';

const modeConfig: Record<OmegaMode, { label: string; description: string; variant: 'success' | 'warning' | 'danger' | 'omega' | 'default' }> = {
  safe: { label: 'SAFE', description: 'All systems running normally. No destructive actions permitted.', variant: 'success' },
  armed: { label: 'ARMED', description: 'Omega systems armed. Critical actions are now enabled.', variant: 'danger' },
  factory: { label: 'FACTORY', description: 'Factory mode active. Mass operations enabled.', variant: 'warning' },
  degraded: { label: 'DEGRADED', description: 'Running in reduced capacity. Non-essential agents suspended.', variant: 'warning' },
  simulation: { label: 'SIMULATION', description: 'Simulation mode. No real actions are executed.', variant: 'omega' },
};

export function OmegaSwitch() {
  const { omegaState, refreshOmega } = useFactory();
  const [state, setState] = useState<OmegaState | null>(omegaState);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void; danger: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(omegaState);
  }, [omegaState]);

  const mode = state?.mode ?? 'safe';
  const cfg = modeConfig[mode];

  const executeAction = async (fn: () => Promise<OmegaState>) => {
    setBusy(true);
    try {
      const newState = await fn();
      setState(newState);
    } finally {
      setBusy(false);
      setConfirm(null);
      refreshOmega();
    }
  };

  const handleArm = () => {
    if (mode === 'safe') {
      setConfirm({
        title: 'Arm Omega Systems',
        message: 'This will enable critical and destructive actions across all agents and projects. Only proceed if you understand the consequences.',
        danger: true,
        action: () => executeAction(() => api.setOmegaMode('armed')),
      });
    } else {
      executeAction(() => api.setOmegaMode('safe'));
    }
  };

  const handleKillSwitch = () => {
    if (!state?.killSwitch) {
      setConfirm({
        title: 'Activate Global Kill Switch',
        message: 'This will immediately halt ALL agents across ALL projects. This is a hard stop — agents will not finish current tasks.',
        danger: true,
        action: () => executeAction(() => api.toggleKillSwitch(true)),
      });
    } else {
      executeAction(() => api.toggleKillSwitch(false));
    }
  };

  const toggleFactory = () => {
    const next = !state?.factoryMode;
    setConfirm({
      title: next ? 'Enable Factory Mode' : 'Disable Factory Mode',
      message: next ? 'Factory mode enables mass operations across all projects simultaneously.' : 'Disabling factory mode will restrict operations to single-project scope.',
      danger: false,
      action: () => executeAction(() => api.toggleFactoryMode(next)),
    });
  };

  const toggleDegraded = () => {
    const next = !state?.degradationMode;
    setConfirm({
      title: next ? 'Enable Degradation Mode' : 'Disable Degradation Mode',
      message: next ? 'Non-essential agents will be suspended. System runs at reduced capacity.' : 'All agents will resume normal operation.',
      danger: false,
      action: () => executeAction(() => api.toggleDegradationMode(next)),
    });
  };

  const toggleSimulation = () => {
    const next = !state?.simulationMode;
    setConfirm({
      title: next ? 'Enable Simulation Mode' : 'Disable Simulation Mode',
      message: next ? 'All actions will be simulated. No real changes will be made to the system.' : 'Actions will resume real execution.',
      danger: false,
      action: () => executeAction(() => api.toggleSimulationMode(next)),
    });
  };

  const isArmed = mode !== 'safe';

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin p-5 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-text leading-tight">Omega Switch</h1>
        <p className="text-[13px] text-textSecondary mt-1">Critical system controls — use with caution</p>
      </div>

      <div className={`p-6 rounded-lg border-2 mb-6 transition-all ${
        isArmed ? 'border-omegaArmed/30 bg-danger/5' : 'border-border bg-surface'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-md flex items-center justify-center ${
              isArmed ? 'bg-danger/10' : 'bg-success/10'
            }`}>
              <Power className={`w-6 h-6 ${isArmed ? 'text-danger' : 'text-success'}`} />
            </div>
            <div>
              <p className="text-[12px] text-textTertiary uppercase tracking-wider">Primary State</p>
              <p className="text-[20px] font-bold text-text">{cfg.label}</p>
            </div>
          </div>
          <PillBadge label={cfg.label} variant={cfg.variant} />
        </div>
        <p className="text-[14px] text-textSecondary leading-relaxed mb-4">{cfg.description}</p>
        <button
          onClick={handleArm}
          disabled={busy}
          className={`w-full h-12 rounded-md font-semibold text-[15px] transition-all ${
            isArmed
              ? 'bg-surfaceSunken text-text hover:bg-border'
              : 'bg-omega text-white hover:bg-omega/90 shadow-medium'
          } disabled:opacity-50`}
        >
          {isArmed ? 'Return to Safe Mode' : 'Arm Omega Systems'}
        </button>
      </div>

      <div className="mb-6">
        <SectionHeader
          title="Global Kill Switch"
          subtitle="Immediately halt all agents"
        />
        <button
          onClick={handleKillSwitch}
          disabled={busy || !isArmed}
          className={`w-full p-4 rounded-md border-2 flex items-center gap-3 transition-all ${
            state?.killSwitch
              ? 'border-danger bg-danger/5'
              : 'border-border bg-surface hover:border-danger/30'
          } ${(!isArmed || busy) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <AlertOctagon className={`w-6 h-6 ${state?.killSwitch ? 'text-danger' : 'text-textTertiary'}`} />
          <div className="text-left flex-1">
            <p className="text-[15px] font-semibold text-text">
              {state?.killSwitch ? 'Kill Switch ACTIVE' : 'Kill Switch Inactive'}
            </p>
            <p className="text-[13px] text-textSecondary">
              {state?.killSwitch ? 'All agents are halted' : 'Requires armed state to activate'}
            </p>
          </div>
        </button>
      </div>

      <div className="mb-6">
        <SectionHeader title="Mode Toggles" subtitle="Independent system modes" />
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="Factory Mode"
            description="Mass operations across all projects"
            enabled={state?.factoryMode ?? false}
            onToggle={toggleFactory}
            disabled={busy || !isArmed}
          />
          <ToggleRow
            label="Degradation Mode"
            description="Suspend non-essential agents"
            enabled={state?.degradationMode ?? false}
            onToggle={toggleDegraded}
            disabled={busy}
          />
          <ToggleRow
            label="Simulation Mode"
            description="No real actions executed"
            enabled={state?.simulationMode ?? false}
            onToggle={toggleSimulation}
            disabled={busy}
          />
        </div>
      </div>

      <div className="pb-8" />

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel="Confirm"
        danger={confirm?.danger}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full p-4 rounded-md bg-surface border border-border flex items-center justify-between transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-soft'
      }`}
    >
      <div className="text-left">
        <p className="text-[15px] font-semibold text-text">{label}</p>
        <p className="text-[13px] text-textSecondary">{description}</p>
      </div>
      {enabled ? (
        <ToggleRight className="w-8 h-8 text-accent flex-shrink-0" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-textTertiary flex-shrink-0" />
      )}
    </button>
  );
}
