// Hook that wires the orchestrator, the ActivityLog, and the chat UI.
import { useCallback, useEffect, useState } from 'react';
import { getOrchestrator } from '../core/createOrchestrator';
import { activityLog } from '../core/ActivityLog';
import type { OrchestratorSnapshot, TaskGraph } from '../core/types';
import { loadProjectContext, buildContextBlock, type ProjectContext } from '../core/ProjectContext';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  engineId?: string;
  engineLabel?: string;
  fellBack?: boolean;
  error?: boolean;
  createdAt: number;
}

let nextMsg = 1;
function msgId(): string {
  return 'm_' + Date.now().toString(36) + '_' + (nextMsg++).toString(36);
}

export function useCodingBrain(projectId?: string) {
  const [projectCtx, setProjectCtx] = useState<ProjectContext | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<OrchestratorSnapshot>(
    getOrchestrator().current(),
  );
  const [lastGraph, setLastGraph] = useState<TaskGraph | null>(null);

  useEffect(() => {
    const unsub = getOrchestrator().subscribe(setSnapshot);
    return unsub;
  }, []);

  // Load project context once when the project opens.
  useEffect(() => {
    if (!projectId) { setProjectCtx(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const ctx = await loadProjectContext(projectId);
        if (!cancelled) setProjectCtx(ctx);
      } catch { /* leave null */ }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const submit = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || busy) return;

      const userMsg: ChatMsg = {
        id: msgId(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);

      try {
        const orch = getOrchestrator();
        let systemContext: string | undefined;
        if (projectCtx) {
          try { systemContext = await buildContextBlock(projectCtx, trimmed); } catch {}
        }
        const graph = await orch.submit(trimmed, { systemContext });
        setLastGraph(graph);

        const gen = graph.nodes.find((n) => n.kind === 'generate');
        const content = (gen && gen.output && (gen.output as any).content) || '';
        const engineId = (gen && gen.output && (gen.output as any).engineId) as string | undefined;
        const engineLabel = (gen && gen.output && (gen.output as any).engineLabel) as string | undefined;
        const fellBack = (gen && gen.output && (gen.output as any).fellBack) as boolean | undefined;

        setMessages((prev) => [
          ...prev,
          {
            id: msgId(),
            role: 'assistant',
            content: content || '(no output)',
            engineId,
            engineLabel,
            fellBack,
            createdAt: Date.now(),
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessages((prev) => [
          ...prev,
          {
            id: msgId(),
            role: 'assistant',
            content: msg,
            error: true,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setLastGraph(null);
    activityLog.emit({
      source: 'System',
      phase: 'idle',
      status: 'info',
      message: 'Chat cleared.',
    });
  }, []);

  return { messages, busy, snapshot, lastGraph, submit, reset };
}
