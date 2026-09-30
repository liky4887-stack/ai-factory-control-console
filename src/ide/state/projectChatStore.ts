// Persists chat + files + draft + engine per project using AsyncStorage
// so navigating out and back (or a dev hot-reload) never wipes state.

import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const DEFAULT_PROJECT_CHAT_STATE: ProjectChatState = {
  messages: [],
  files: [],
  draft: '',
  engine: 'deepseek',
};

const KEY = (id: string) => 'ide.chat.' + id;

export async function loadProjectChat(projectId: string): Promise<ProjectChatState> {
  try {
    const raw = await AsyncStorage.getItem(KEY(projectId));
    if (!raw) return { ...DEFAULT_PROJECT_CHAT_STATE };
    const parsed = JSON.parse(raw) as ProjectChatState;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
      draft: typeof parsed.draft === 'string' ? parsed.draft : '',
      engine: typeof parsed.engine === 'string' ? parsed.engine : 'deepseek',
    };
  } catch {
    return { ...DEFAULT_PROJECT_CHAT_STATE };
  }
}

export async function saveProjectChat(projectId: string, state: ProjectChatState): Promise<void> {
  try { await AsyncStorage.setItem(KEY(projectId), JSON.stringify(state)); }
  catch { /* ignore */ }
}

export async function clearProjectChat(projectId: string): Promise<void> {
  try { await AsyncStorage.removeItem(KEY(projectId)); }
  catch { /* ignore */ }
}
