// Lightweight state container for the IDE.
// No Zustand dependency; a plain class + React Context.
// Wraps the global activityLog so React components can read it via hooks.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { activityLog } from '../core/ActivityLog';
import type { ActivityEvent, OrchestratorSnapshot } from '../core/types';

export interface IdeStore {
  events: ActivityEvent[];
  orchestrator: OrchestratorSnapshot;
  setOrchestrator(snapshot: OrchestratorSnapshot): void;
}

interface IdeStoreInternal extends IdeStore {
  _listeners: Set<() => void>;
}

const initialOrchestrator: OrchestratorSnapshot = {
  state: 'idle',
  taskId: null,
  since: Date.now(),
  lastMessage: 'Waiting for a request.',
  error: null,
};

function createStore(): IdeStoreInternal {
  const store: IdeStoreInternal = {
    events: [],
    orchestrator: initialOrchestrator,
    _listeners: new Set(),
    setOrchestrator(snapshot) {
      store.orchestrator = snapshot;
      for (const l of store._listeners) l();
    },
  };

  // Bridge the ActivityLog singleton into this store.
  activityLog.subscribe((events) => {
    store.events = events;
    for (const l of store._listeners) l();
  });

  return store;
}

const IdeStoreContext = createContext<IdeStoreInternal | null>(null);

export function IdeStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createStore());
  return React.createElement(IdeStoreContext.Provider, { value: store }, children);
}

function useStoreInternal(): IdeStoreInternal {
  const s = useContext(IdeStoreContext);
  if (!s) throw new Error('IdeStoreProvider missing at tree root');
  return s;
}

/** Subscribe to the whole store (re-renders on any change). */
export function useIdeStore(): IdeStore {
  const store = useStoreInternal();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    store._listeners.add(l);
    return () => { store._listeners.delete(l); };
  }, [store]);
  return store;
}

/** Convenience: latest N events, newest first. */
export function useRecentEvents(n: number): ActivityEvent[] {
  const { events } = useIdeStore();
  return events.slice(-n).reverse();
}

/** Snapshot of the orchestrator state machine. */
export function useOrchestrator(): OrchestratorSnapshot {
  return useIdeStore().orchestrator;
}

export { activityLog };
