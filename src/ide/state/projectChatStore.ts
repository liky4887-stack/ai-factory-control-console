// Persists chat + files + draft + engine per project across screen
// unmounts. Navigating Preview → back would otherwise wipe every
// message because the screen re-mounts with fresh local state.

import type { BuiltFile } from '../../services/api';

export interface PersistedMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  engineLabel?: string;
  fellBack?: boolean;
  error?: boolean;
  builtFiles?: Array<{ path: string; bytes: number }>;
}

export interface ProjectChatState {
  messages: PersistedMsg[];
  files: BuiltFile[];
  draft: string;
  engine: string;
}

const states = new Map<string, ProjectChatState>();

export function getProjectChatState(projectId: string): ProjectChatState {
  let s = states.get(projectId);
  if (!s) {
    s = { messages: [], files: [], draft: '', engine: 'deepseek' };
    states.set(projectId, s);
  }
  return s;
}

export function setProjectChatState(projectId: string, patch: Partial<ProjectChatState>): void {
  const cur = getProjectChatState(projectId);
  states.set(projectId, { ...cur, ...patch });
}

export function clearProjectChatState(projectId: string): void {
  states.delete(projectId);
}
