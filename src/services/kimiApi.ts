// Kimi engine HTTP client. Mirrors qwenApi.ts shape so AuthDebugPanel
// can treat all three engines identically.
import { getBaseUrl } from './deepseekApi';

export interface KimiHealth {
  engineId: string;
  configured: boolean;
  healthy: boolean;
  cookiesLength?: number;
  hasBearer?: boolean;
  hasCsrf?: boolean;
  acquiredAt?: number | null;
  wafState?: {
    state: string;
    cooldownRemainingMs: number;
    totalTrips: number;
  };
  throttleState?: {
    inFlight: boolean;
    recentCount: number;
    maxPerDay: number;
    effectiveGapSeconds: number;
    nextAllowedInMs: number;
    cooldownRemainingMs: number;
    totalTrips: number;
  };
  lastCallAt?: number | null;
  lastCallOk?: boolean | null;
  lastCallError?: string | null;
}

export interface KimiCredRaw {
  cookies: string;
  bearerToken: string | null;
  csrfToken: string | null;
  extraHeaders: Record<string, string> | null;
  acquiredAt: number | null;
}

export interface KimiCredRedacted {
  configured: boolean;
  hasCookies: boolean;
  hasBearer: boolean;
  hasExtraHeaders: boolean;
  acquiredAt: number | null;
}

export interface KimiSaveInput {
  cookies: string;
  bearerToken?: string;
  csrfToken?: string;
  extraHeaders?: Record<string, string>;
}

export async function getKimiHealth(): Promise<KimiHealth> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/kimi/health`);
  if (!r.ok) throw new Error(`Kimi health HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Kimi health failed');
  return j.status as KimiHealth;
}

export async function getKimiCredStatus(): Promise<KimiCredRedacted> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/kimi/credentials/status`);
  if (!r.ok) throw new Error(`Kimi status HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Kimi status failed');
  return j.status as KimiCredRedacted;
}

export async function getKimiCredRaw(): Promise<KimiCredRaw> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/kimi/credentials/raw`);
  if (r.status === 404) throw new Error('no credentials configured');
  if (!r.ok) throw new Error(`Kimi raw HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Kimi raw failed');
  return j.values as KimiCredRaw;
}

export async function saveKimiCreds(input: KimiSaveInput): Promise<{
  cookiesLength: number;
  hasBearer: boolean;
  hasCsrf: boolean;
}> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/kimi/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }));
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j.stored;
}

export async function clearKimiCreds(): Promise<void> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/kimi/credentials`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Kimi clear HTTP ${r.status}`);
}
