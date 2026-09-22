import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-text/40 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm p-6 rounded-lg bg-surface shadow-lifted animate-slide-up">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
              danger ? 'bg-danger/10' : 'bg-omegaSoft'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-danger' : 'text-omega'}`} />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-text">{title}</h3>
            <p className="text-[14px] text-textSecondary mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-md bg-surfaceSunken text-text font-medium text-[14px] hover:bg-border transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-md text-white font-semibold text-[14px] transition-colors ${
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-omega hover:bg-omega/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
