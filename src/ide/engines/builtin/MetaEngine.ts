// Persists a compact record of every completed task. Over time these
// form "playbooks" — repeatedly successful patterns.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Engine, EngineContext, EngineResult } from '../Engine';
import { runWrapped } from '../Engine';

export interface TaskRecord {
  id: string;
  projectId: string | null;
  promptHash: string;
  promptHead: string;
  phases: string[];
  succeeded: boolean;
  elapsedMs: number;
  engineId: string | null;
  timestamp: number;
}

export interface MetaOutput {
  recorded: boolean;
  totalRecords: number;
  newPlaybooks: string[];
}

const META_KEY = 'ide.meta.records';
const PLAYBOOK_KEY = 'ide.meta.playbooks';
const MAX_RECORDS = 500;

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(36);
}

export class MetaEngine implements Engine<{
  prompt: string;
  phases: string[];
  succeeded: boolean;
  elapsedMs: number;
  engineId: string | null;
}, MetaOutput> {
  readonly id = 'meta';
  readonly label = 'Meta Learning';
  readonly phase = 'meta' as const;

  async run(input: {
    prompt: string;
    phases: string[];
    succeeded: boolean;
    elapsedMs: number;
    engineId: string | null;
  }, ctx: EngineContext): Promise<EngineResult<MetaOutput>> {
    return runWrapped(async () => {
      let records: TaskRecord[] = [];
      try {
        const raw = await AsyncStorage.getItem(META_KEY);
        if (raw) records = JSON.parse(raw) as TaskRecord[];
      } catch {}

      const rec: TaskRecord = {
        id: 'rec_' + Date.now().toString(36),
        projectId: ctx.projectId,
        promptHash: hash(input.prompt),
        promptHead: input.prompt.slice(0, 80),
        phases: input.phases,
        succeeded: input.succeeded,
        elapsedMs: input.elapsedMs,
        engineId: input.engineId,
        timestamp: Date.now(),
      };
      records.push(rec);
      if (records.length > MAX_RECORDS) records = records.slice(-MAX_RECORDS);

      try { await AsyncStorage.setItem(META_KEY, JSON.stringify(records)); }
      catch {}

      const byHash = new Map<string, TaskRecord[]>();
      for (const r of records) {
        if (!r.succeeded) continue;
        const list = byHash.get(r.promptHash) || [];
        list.push(r);
        byHash.set(r.promptHash, list);
      }

      let playbooks: Array<{ hash: string; phases: string[]; count: number; example: string }> = [];
      try {
        const raw = await AsyncStorage.getItem(PLAYBOOK_KEY);
        if (raw) playbooks = JSON.parse(raw);
      } catch {}

      const newPlaybooks: string[] = [];
      for (const [h, list] of byHash.entries()) {
        if (list.length < 3) continue;
        if (playbooks.some((p) => p.hash === h)) continue;
        const pb = { hash: h, phases: list[0].phases, count: list.length, example: list[0].promptHead };
        playbooks.push(pb);
        newPlaybooks.push(list[0].promptHead);
        ctx.emit('Meta', 'meta', 'success', 'New playbook: ' + list[0].promptHead, { count: list.length });
      }
      if (newPlaybooks.length > 0) {
        try { await AsyncStorage.setItem(PLAYBOOK_KEY, JSON.stringify(playbooks)); }
        catch {}
      }

      ctx.emit('Meta', 'meta', 'info', 'Recorded task (' + records.length + ' total)', {
        succeeded: input.succeeded,
        phases: input.phases.length,
      });

      return { recorded: true, totalRecords: records.length, newPlaybooks };
    }, { softFailure: true });
  }
}
