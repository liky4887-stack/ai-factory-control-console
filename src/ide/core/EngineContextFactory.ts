// Creates an EngineContext for a phase run. The context is the single
// surface every engine talks to — activity log, model calls, files,
// prior phase outputs, and persistent key/value storage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { activityLog } from './ActivityLog';
import { ModelAgentRegistry } from './ModelAgentRegistry';
import type { EngineContext } from '../engines/EngineContext';
import type { PhaseId } from '../engines/PhaseRegistry';
import type { ActivityPhase, ActivitySource, ActivityStatus } from './types';
import { api } from '../../services/api';

export interface EngineContextOptions {
  taskId: string | null;
  projectId: string | null;
  prompt: string;
  registry: ModelAgentRegistry;
  enginePreference?: string[];
}

export function createEngineContext(opts: EngineContextOptions): EngineContext {
  const phaseOutputs = new Map<PhaseId, unknown>();

  return {
    taskId: opts.taskId,
    projectId: opts.projectId,
    prompt: opts.prompt,

    emit(source: ActivitySource, phase: ActivityPhase | PhaseId, status: ActivityStatus, message: string, metadata?: Record<string, unknown>) {
      activityLog.emit({
        source,
        phase: phase as ActivityPhase,
        status,
        message,
        taskId: opts.taskId,
        metadata,
      });
    },

    async callModel(messages, options) {
      const resp = await opts.registry.callWithFallback({
        messages,
        taskId: opts.taskId,
        enginePreference: options?.enginePreference ?? opts.enginePreference,
      });
      return { content: resp.content, engineId: resp.engineId, engineLabel: resp.engineLabel };
    },

    async listFiles() {
      if (!opts.projectId) return [];
      try {
        const files = await api.listProjectFiles(opts.projectId);
        return files.map((f) => ({ path: f.path, bytes: f.bytes }));
      } catch { return []; }
    },

    async readFile(path) {
      if (!opts.projectId) throw new Error('no project context');
      return api.getProjectFile(opts.projectId, path);
    },

    async writeFile(path, content) {
      if (!opts.projectId) throw new Error('no project context');
      // ProjectFileStorage on the backend does not expose a direct single-
      // file write route today; the build pipeline writes files. Chat
      // phases that need to write should go through /projects/:id/build.
      // For now this is a no-op stub that emits an event.
      activityLog.emit({
        source: 'System',
        phase: 'generate',
        status: 'info',
        message: 'writeFile(' + path + ', ' + content.length + 'B) requested but not yet wired',
        taskId: opts.taskId,
      });
    },

    getPhaseOutput<T = unknown>(phase: PhaseId): T | undefined {
      return phaseOutputs.get(phase) as T | undefined;
    },
    setPhaseOutput(phase, output) { phaseOutputs.set(phase, output); },

    async getState(key) {
      try {
        const raw = await AsyncStorage.getItem('ide.state.' + key);
        return raw ? (JSON.parse(raw) as never) : undefined;
      } catch { return undefined; }
    },
    async setState(key, value) {
      try { await AsyncStorage.setItem('ide.state.' + key, JSON.stringify(value)); }
      catch { /* ignore */ }
    },
  };
}
