// Qwen engine HTTP client. Mirrors the DeepSeek debug API shape so
// AuthDebugPanel can treat both engines identically.
import { getBaseUrl } from './deepseekApi';

export interface QwenHealth {
  engineId: string;
  configured: boolean;
  healthy: boolean;
  cookiesLength?: number;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  hasBxUa?: boolean;
  hasBxUmidToken?: boolean;
  hasBxV?: boolean;
  acquiredAt?: number | null;
  lastCallAt?: number | null;
  lastCallOk?: boolean | null;
  lastCallError?: string | null;
}

export interface QwenCredRaw {
  cookies: string;
  accessToken: string | null;
  refreshToken: string | null;
  bxUa: string | null;
  bxUmidToken: string | null;
  bxV: string | null;
  timezone: string | null;
  acquiredAt: number | null;
}

export interface QwenCredRedacted {
  configured: boolean;
  hasCookies: boolean;
  hasBearer: boolean;
  hasExtraHeaders: boolean;
  acquiredAt: number | null;
}

export interface QwenSaveInput {
  cookies: string;
  accessToken: string;
  refreshToken?: string;
  bxUa?: string;
  bxUmidToken?: string;
  bxV?: string;
  timezone?: string;
}

export async function getQwenHealth(): Promise<QwenHealth> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/engines/engine_qwen/health`);
  if (!r.ok) throw new Error(`Qwen health HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Qwen health failed');
  return j.status as QwenHealth;
}

export async function getQwenCredStatus(): Promise<QwenCredRedacted> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/qwen/credentials/status`);
  if (!r.ok) throw new Error(`Qwen status HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Qwen status failed');
  return j.status as QwenCredRedacted;
}

export async function getQwenCredRaw(): Promise<QwenCredRaw> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/qwen/credentials/raw`);
  if (r.status === 404) throw new Error('no credentials configured');
  if (!r.ok) throw new Error(`Qwen raw HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Qwen raw failed');
  return j.values as QwenCredRaw;
}

export async function saveQwenCreds(input: QwenSaveInput): Promise<{ cookiesLength: number; accessTokenLength: number; hasRefreshToken: boolean; hasBxUa: boolean }> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/qwen/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }));
  if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j.stored;
}

export async function clearQwenCreds(): Promise<void> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/qwen/credentials`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Qwen clear HTTP ${r.status}`);
}
