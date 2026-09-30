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

export class ModelAgentRegistry {
  private agents = new Map<string, ModelAgent>();
  private preferenceOrder: string[] = [];

  constructor(agents: ModelAgent[], preferenceOrder?: string[]) {
    for (const a of agents) this.agents.set(a.engineId, a);
    this.preferenceOrder =
      preferenceOrder && preferenceOrder.length > 0
        ? preferenceOrder.filter((id) => this.agents.has(id))
        : agents.map((a) => a.engineId);
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
    const order = req.enginePreference && req.enginePreference.length > 0
      ? req.enginePreference.map((id) => this.agents.get(id)).filter((a): a is ModelAgent => !!a)
      : this.ordered();

    if (order.length === 0) {
      throw new Error('no model agents registered');
    }

    let lastError: unknown = null;
    for (let i = 0; i < order.length; i++) {
      const agent = order[i];
      try {
        const resp = await agent.call(req);
        if (i > 0) resp.fellBack = true;
        return resp;
      } catch (e) {
        lastError = e;
      }
    }
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error('all agents failed; last: ' + msg);
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
