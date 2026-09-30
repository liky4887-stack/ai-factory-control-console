// Known engines and the order in which we prefer them.
// Kept explicit rather than dynamic so preference lists are readable
// and adjustable in one place.

import { HttpModelAgent } from './ModelAgent';
import type { ModelAgent, ModelAgentRequest, ModelAgentResponse } from './types';

export interface AgentSpec {
  engineId: string;
  label: string;
}

export const DEFAULT_AGENTS: AgentSpec[] = [
  { engineId: 'engine_deepseek', label: 'DeepSeek' },
  { engineId: 'engine_deephat',  label: 'DeepHat' },
  { engineId: 'engine_kimi',     label: 'Kimi' },
  { engineId: 'engine_qwen',     label: 'Qwen' },
];

// Recent-failure cooldown: when an engine fails, skip it for this many ms
// before trying again. Prevents the fallback chain from repeatedly hitting
// a dead engine (e.g. Qwen when Chromium isn't running).
const FAILURE_COOLDOWN_MS = 90_000;

export class ModelAgentRegistry {
  private agents = new Map<string, ModelAgent>();
  private preferenceOrder: string[] = [];
  private failureCooldown = new Map<string, number>();

  constructor(agents: ModelAgent[], preferenceOrder?: string[]) {
    for (const a of agents) this.agents.set(a.engineId, a);
    this.preferenceOrder =
      preferenceOrder && preferenceOrder.length > 0
        ? preferenceOrder.filter((id) => this.agents.has(id))
        : agents.map((a) => a.engineId);
  }

  /** Mark an engine as recently failed. It's skipped for FAILURE_COOLDOWN_MS. */
  private markFailure(engineId: string): void {
    this.failureCooldown.set(engineId, Date.now() + FAILURE_COOLDOWN_MS);
  }

  /** True when the engine is in cooldown and should be skipped. */
  private isCoolingDown(engineId: string): boolean {
    const until = this.failureCooldown.get(engineId);
    if (!until) return false;
    if (Date.now() >= until) {
      this.failureCooldown.delete(engineId);
      return false;
    }
    return true;
  }

  /** Engines that would be tried right now (excludes cooling-down ones). */
  healthyOrder(): ModelAgent[] {
    return this.ordered().filter((a) => !this.isCoolingDown(a.engineId));
  }

  list(): ModelAgent[] {
    return Array.from(this.agents.values());
  }

  get(engineId: string): ModelAgent | undefined {
    return this.agents.get(engineId);
  }

  /** Agents in preference order. */
  ordered(): ModelAgent[] {
    return this.preferenceOrder
      .map((id) => this.agents.get(id))
      .filter((a): a is ModelAgent => !!a);
  }

  /**
   * Try each preferred agent until one succeeds. If req.enginePreference is
   * given, that order wins; otherwise the registry's own order.
   */
  async callWithFallback(req: ModelAgentRequest): Promise<ModelAgentResponse> {
    const preferred = req.enginePreference && req.enginePreference.length > 0
      ? req.enginePreference.map((id) => this.agents.get(id)).filter((a): a is ModelAgent => !!a)
      : this.ordered();

    // Skip engines that are in a failure cooldown.
    const order = preferred.filter((a) => !this.isCoolingDown(a.engineId));
    // If *everything* is cooling down, fall back to the full list so we
    // still try — better to retry a dead engine than give up entirely.
    const tryOrder = order.length > 0 ? order : preferred;

    if (tryOrder.length === 0) {
      throw new Error('no model agents registered');
    }

    let lastError: unknown = null;
    for (let i = 0; i < tryOrder.length; i++) {
      const agent = tryOrder[i];
      try {
        const resp = await agent.call(req);
        if (i > 0) resp.fellBack = true;
        // A success clears any cooldown for this engine.
        this.failureCooldown.delete(agent.engineId);
        return resp;
      } catch (e) {
        lastError = e;
        this.markFailure(agent.engineId);
      }
    }
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error('all agents failed; last: ' + msg);
  }

  /** Explicit skip — callable from anywhere. */
  skip(engineId: string, durationMs = FAILURE_COOLDOWN_MS): void {
    this.failureCooldown.set(engineId, Date.now() + durationMs);
  }
}

/**
 * Factory used by the app to build a registry. Depends on a fetch of
 * /engines to know what's actually registered on the backend.
 */
export function buildDefaultRegistry(baseUrl: string): ModelAgentRegistry {
  const agents: ModelAgent[] = DEFAULT_AGENTS.map(
    (spec) =>
      new HttpModelAgent({
        baseUrl,
        engineId: spec.engineId,
        label: spec.label,
      }),
  );
  return new ModelAgentRegistry(agents);
}
