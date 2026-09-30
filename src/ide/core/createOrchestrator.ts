// Singleton factory for the IDE's orchestrator, model registry, and
// engine registry. Same base URL as services/api.ts.
//
// Every engine is registered here once. Adding a new engine is one line.

import { buildDefaultRegistry, ModelAgentRegistry } from './ModelAgentRegistry';
import { CognitiveOrchestrator } from './CognitiveOrchestrator';
import { EngineRegistry } from '../engines';

// Built-in engines
import { UnderstandEngine } from '../engines/builtin/UnderstandEngine';
import { PlanEngine } from '../engines/builtin/PlanEngine';
import { GenerateEngine } from '../engines/builtin/GenerateEngine';
import { AuditEngine } from '../engines/builtin/AuditEngine';
import { DiffEngine } from '../engines/builtin/DiffEngine';
import { HealEngine } from '../engines/builtin/HealEngine';
import { MetaEngine } from '../engines/builtin/MetaEngine';
import { SkillsEngine } from '../engines/builtin/SkillsEngine';

const DEFAULT_BASE = 'http://127.0.0.1:8790';

let baseUrl = DEFAULT_BASE;
let modelRegistry: ModelAgentRegistry | null = null;
let engineRegistry: EngineRegistry | null = null;
let orchestrator: CognitiveOrchestrator | null = null;

export function getBaseUrl(): string { return baseUrl; }

export function setBaseUrl(url: string): void {
  const trimmed = url.replace(/\/+$/, '');
  if (trimmed === baseUrl) return;
  baseUrl = trimmed;
  modelRegistry = null;
  engineRegistry = null;
  orchestrator = null;
}

export function getModelRegistry(): ModelAgentRegistry {
  if (!modelRegistry) modelRegistry = buildDefaultRegistry(baseUrl);
  return modelRegistry;
}

export function getEngineRegistry(): EngineRegistry {
  if (engineRegistry) return engineRegistry;
  const reg = new EngineRegistry();
  // Model-driven phases
  reg.register(new UnderstandEngine());
  reg.register(new PlanEngine());
  reg.register(new GenerateEngine());
  // Deterministic phases
  reg.register(new AuditEngine());
  reg.register(new DiffEngine());
  reg.register(new HealEngine());
  reg.register(new MetaEngine());
  reg.register(new SkillsEngine());
  engineRegistry = reg;
  return reg;
}

async function probeHealth(reg: ModelAgentRegistry): Promise<void> {
  // Best-effort: probe each agent's /health and skip the ones that fail.
  // Runs once on first call. Failure is silent — real calls will retry.
  const agents = reg.list();
  await Promise.all(agents.map(async (a) => {
    try {
      const ok = await a.isAvailable();
      if (!ok) reg.skip(a.engineId, 60_000);
    } catch { /* ignore */ }
  }));
}

let probed = false;
function ensureProbed(reg: ModelAgentRegistry): void {
  if (probed) return;
  probed = true;
  void probeHealth(reg);
}

export function getOrchestrator(): CognitiveOrchestrator {
  if (!orchestrator) {
    const modelReg = getModelRegistry();
    ensureProbed(modelReg);
    orchestrator = new CognitiveOrchestrator({
      registry: modelReg,
      engines: getEngineRegistry(),
    });
  }
  return orchestrator;
}
