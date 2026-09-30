// DeepHat engine HTTP client. Mirrors qwenApi.ts / kimiApi.ts shape
// so AuthDebugPanel can treat all four engines identically.
import { getBaseUrl } from './deepseekApi';

export interface DeepHatHealth {
  engineId: string;
  configured: boolean;
  healthy: boolean;
  gatewayUrl?: string;
  gatewayOk?: boolean;
  gatewayError?: string | null;
  lastCallAt?: number | null;
  lastCallOk?: boolean | null;
  lastCallError?: string | null;
}

export interface DeepHatCredRaw {
  cookies: string;
  authorization: string | null;
  acquiredAt: number | null;
}

export interface DeepHatCredRedacted {
  configured: boolean;
  hasCookies: boolean;
  hasBearer: boolean;
  hasExtraHeaders: boolean;
  acquiredAt: number | null;
}

export interface DeepHatSaveInput {
  cookies: string;
  authorization?: string;
}

// Accept two shapes of input for cookies:
//   1. A raw cookie header string:   "name1=value1; name2=value2; ..."
//   2. A JSON array (the browser cookie-export format):
//      [{"name":"__Host-authjs.csrf-token","value":"...","domain":"app.deephat.ai"}, ...]
// Returns the joined header string. Returns "" if input is unparseable.
export function normalizeCookiesInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as Array<{ name: string; value: string }>;
      if (!Array.isArray(arr)) return trimmed;
      return arr
        .filter((c) => c && typeof c.name === 'string' && typeof c.value === 'string')
        .map((c) => c.name + '=' + c.value)
        .join('; ');
    } catch { return trimmed; }
  }
  return trimmed;
}

export async function getDeepHatHealth(): Promise<DeepHatHealth> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deephad/health`);
  if (!r.ok) throw new Error(`DeepHat health HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'DeepHat health failed');
  return j.status as DeepHatHealth;
}

export async function getDeepHatCredStatus(): Promise<DeepHatCredRedacted> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deephad/credentials/status`);
  if (!r.ok) throw new Error(`DeepHat status HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'DeepHat status failed');
  return j.status as DeepHatCredRedacted;
}

export async function getDeepHatCredRaw(): Promise<DeepHatCredRaw> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deephad/credentials/raw`);
  if (r.status === 404) throw new Error('no credentials configured');
  if (!r.ok) throw new Error(`DeepHat raw HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'DeepHat raw failed');
  return j.values as DeepHatCredRaw;
}

export async function saveDeepHatCreds(input: DeepHatSaveInput): Promise<{ cookiesLength: number; hasAuthorization: boolean }> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deephad/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }));
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j.stored;
}

export async function clearDeepHatCreds(): Promise<void> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deephad/credentials`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`DeepHat clear HTTP ${r.status}`);
}
