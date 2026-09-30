// A ModelAgent is the IDE's handle to one backend engine.
// It always calls the same OpenAI-shaped endpoint:
//   POST /engines/{engineId}/chat
//   body: { prompt }  or  { messages }
//   response: { ok, engineId, response: { code, msg, data: { content, ... } } }
//
// Different engines behave differently (Qwen goes through a browser,
// Kimi/DeepHat through local gateways, DeepSeek direct), but the
// surface is uniform. That is the point of this abstraction.

import type { ModelAgent, ModelAgentRequest, ModelAgentResponse } from './types';

export interface ModelAgentDeps {
  baseUrl: string;
  engineId: string;
  label: string;
  /** Timeout for a single call, ms. Default 300s — browser engines can be slow. */
  timeoutMs?: number;
  /** Optional logger hook. The ActivityLog integration lives at a higher layer. */
  onLog?: (msg: string, meta?: Record<string, unknown>) => void;
  /**
   * Optional pre-flight check. Runs before every real call. When it
   * returns false (or throws), the call is rejected immediately with a
   * short error — no network round-trip to the backend.
   */
  preflight?: () => Promise<boolean>;
}

export class HttpModelAgent implements ModelAgent {
  readonly id: string;
  readonly label: string;
  readonly engineId: string;

  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly onLog: NonNullable<ModelAgentDeps['onLog']>;
  private readonly preflight: (() => Promise<boolean>) | null;

  constructor(deps: ModelAgentDeps) {
    this.baseUrl = deps.baseUrl.replace(/\/+$/, '');
    this.engineId = deps.engineId;
    this.label = deps.label;
    this.id = 'agent_' + deps.engineId.replace(/^engine_/, '');
    this.timeoutMs = deps.timeoutMs ?? 300_000;
    this.onLog = deps.onLog ?? (() => {});
    this.preflight = deps.preflight ?? null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(this.baseUrl + '/engines/' + encodeURIComponent(this.engineId) + '/health', {
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return false;
      const j: any = await r.json().catch(() => null);
      if (!j || !j.ok) return false;
      const status = j.status as { healthy?: boolean; configured?: boolean } | undefined;
      if (!status) return false;
      return status.healthy === true || status.configured === true;
    } catch {
      return false;
    }
  }

  async call(req: ModelAgentRequest): Promise<ModelAgentResponse> {
    const started = Date.now();

    // Fast-fail pre-flight. If the dependency behind this engine is
    // unreachable (e.g. Chromium for Qwen), reject immediately so the
    // fallback chain moves on in milliseconds, not seconds.
    if (this.preflight) {
      let ok = false;
      try { ok = await this.preflight(); } catch { ok = false; }
      if (!ok) {
        this.onLog('model.call.preflight_failed', { engineId: this.engineId });
        throw new Error(this.engineId + ': pre-flight check failed (dependency unreachable)');
      }
    }

    this.onLog('model.call.start', { engineId: this.engineId, messages: req.messages.length });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.baseUrl + '/engines/' + encodeURIComponent(this.engineId) + '/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: req.messages }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const elapsedMs = Date.now() - started;
    const text = await res.text();
    let j: any = null;
    try { j = JSON.parse(text); } catch { /* fall through */ }

    if (!res.ok || !j || j.ok !== true) {
      const detail =
        (j && j.error) ||
        (j && j.code) ||
        text.slice(0, 240) ||
        ('HTTP ' + res.status);
      this.onLog('model.call.error', { engineId: this.engineId, detail });
      throw new Error(
        this.engineId + ': ' + String(detail).slice(0, 300),
      );
    }

    const content =
      (j.response && j.response.data && j.response.data.content) || '';

    this.onLog('model.call.success', {
      engineId: this.engineId,
      chars: content.length,
      elapsedMs,
    });

    return {
      engineId: this.engineId,
      engineLabel: this.label,
      content,
      elapsedMs,
      fellBack: false,
    };
  }
}
