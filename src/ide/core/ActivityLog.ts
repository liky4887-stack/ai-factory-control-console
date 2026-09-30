// Global activity bus. Every engine and orchestrator writes here.
// The UI subscribes to render the Glass Box feed.
// Uses a ring buffer with cap; older events are dropped.
// No React — pure TS. UI hooks live in state/ideStore.ts.

import type { ActivityEvent, ActivitySource, ActivityPhase, ActivityStatus } from './types';

const MAX_EVENTS = 2000;

type Listener = (events: ActivityEvent[]) => void;

let nextId = 1;

function makeId(): string {
  return 'ev_' + Date.now().toString(36) + '_' + (nextId++).toString(36);
}

export class ActivityLog {
  private events: ActivityEvent[] = [];
  private listeners = new Set<Listener>();
  private pinned = new Set<string>();

  /** Emit an event. Returns the fully populated event. */
  emit(input: {
    source: ActivitySource;
    phase: ActivityPhase;
    status: ActivityStatus;
    message: string;
    taskId?: string | null;
    metadata?: Record<string, unknown>;
  }): ActivityEvent {
    const ev: ActivityEvent = {
      id: makeId(),
      taskId: input.taskId ?? null,
      timestamp: Date.now(),
      source: input.source,
      phase: input.phase,
      status: input.status,
      message: input.message,
      metadata: input.metadata,
    };
    this.events.push(ev);
    if (this.events.length > MAX_EVENTS) {
      // Drop oldest, but never drop pinned.
      const drop = this.events.length - MAX_EVENTS;
      const survivors: ActivityEvent[] = [];
      let dropped = 0;
      for (const e of this.events) {
        if (dropped < drop && !this.pinned.has(e.id)) {
          dropped++;
          continue;
        }
        survivors.push(e);
      }
      this.events = survivors;
    }
    this.notify();
    return ev;
  }

  /** All events, oldest first. */
  all(): ActivityEvent[] {
    return this.events;
  }

  /** Events for one task, oldest first. */
  forTask(taskId: string): ActivityEvent[] {
    return this.events.filter((e) => e.taskId === taskId);
  }

  /** Latest N events, newest first. */
  recent(n: number): ActivityEvent[] {
    return this.events.slice(-n).reverse();
  }

  pin(eventId: string): void {
    this.pinned.add(eventId);
    this.notify();
  }

  unpin(eventId: string): void {
    this.pinned.delete(eventId);
    this.notify();
  }

  isPinned(eventId: string): boolean {
    return this.pinned.has(eventId);
  }

  clear(): void {
    this.events = [];
    this.pinned.clear();
    this.notify();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify(): void {
    const snapshot = this.events.slice();
    for (const fn of this.listeners) {
      try { fn(snapshot); } catch { /* swallow */ }
    }
  }
}

// Singleton — one log per app instance.
export const activityLog = new ActivityLog();
