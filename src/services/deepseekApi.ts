/**
 * Direct HTTP client for the Termux-hosted DeepSeek bridge.
 * No proxy. No relay. No rerouting.
 *
 * Endpoint contract (from packages/core/src/deepseek/http/DeepSeekRouter.ts):
 *   GET  /deepseek/health        -> { ok, status }
 *   POST /deepseek/chat          -> { ok, response: { code, msg, data: { content, chat_session_id, message_id } } }
 *   POST /deepseek/refresh       -> { ok, tokenPreview, expiresAt }
 */

const PORT = 8790;

// Candidate base URLs, tried in order on first use.
// Override at runtime via setBackendUrl() if auto-detect picks the wrong one.
const CANDIDATES = [
  `http://127.0.0.1:${PORT}`,        // same-device loopback (Expo Go on the same phone)
  `http://localhost:${PORT}`,        // same-device alternative
  `http://192.168.43.101:${PORT}`,   // LAN IP for cross-device dev on the same WiFi
];

let cachedBase: string | null = null;
let probing: Promise<string | null> | null = null;

async function probeOne(url: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(`${url}/deepseek/health`, { signal: controller.signal });
    clearTimeout(timer);
    return r.ok;
  } catch {
    return false;
  }
}

async function probeAll(): Promise<string | null> {
  for (const url of CANDIDATES) {
    if (await probeOne(url)) return url;
  }
  return null;
}

/** Return the first reachable backend base URL, or throw if none respond. */
export async function getBaseUrl(): Promise<string> {
  if (cachedBase) return cachedBase;
  if (!probing) probing = probeAll();
  const found = await probing;
  probing = null;
  if (!found) {
    throw new Error(
      'Backend unreachable on 127.0.0.1, localhost, or 192.168.43.101. ' +
      'Confirm the Termux backend is running: ~/start-factory.sh'
    );
  }
  cachedBase = found;
  return found;
}

/** Force a specific base URL (e.g. after a failed probe). */
export function setBackendUrl(url: string): void {
  cachedBase = url.replace(/\/+$/, '');
}

/** Clear the cached base so the next call re-probes all candidates. */
export function resetBackendUrl(): void {
  cachedBase = null;
  probing = null;
}

// ─── Types ────────────────────────────────────────────────────

export interface DeepSeekHealth {
  credentialsConfigured: boolean;
  bearerLength: number;
  cookiesLength: number;
  hasHifLeim: boolean;
  hasHifDliq: boolean;
  hasDeviceId: boolean;
  powWasmPresent: boolean;
  powWasmLoaded: boolean;
  bearerValid: boolean | null;
  lastError?: string;
}

export interface DeepSeekChatResult {
  content: string;
  chat_session_id: string | null;
  message_id: number | null;
}

export interface DeepSeekChatOptions {
  thinkingEnabled?: boolean;
  searchEnabled?: boolean;
  sessionId?: string;
  signal?: AbortSignal;
}

// ─── Public calls ─────────────────────────────────────────────

export async function deepseekHealth(): Promise<DeepSeekHealth> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deepseek/health`);
  if (!r.ok) throw new Error(`Health HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Health probe failed');
  return j.status as DeepSeekHealth;
}

export async function deepseekChat(
  prompt: string,
  options: DeepSeekChatOptions = {}
): Promise<DeepSeekChatResult> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deepseek/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      sessionId: options.sessionId ?? 'default',
      thinkingEnabled: options.thinkingEnabled ?? false,
      searchEnabled: options.searchEnabled ?? false,
    }),
    signal: options.signal,
  });
  if (!r.ok) throw new Error(`Chat HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Chat request failed');
  // Backend wraps in { ok, response: { code, msg, data: {...} } }
  const data = j.response?.data;
  if (!data || typeof data.content !== 'string') {
    throw new Error('Chat response missing content');
  }
  return {
    content: data.content,
    chat_session_id: data.chat_session_id ?? null,
    message_id: data.message_id ?? null,
  };
}

export async function deepseekRefresh(): Promise<{ tokenPreview: string; expiresAt: number }> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deepseek/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ force: true }),
  });
  if (!r.ok) throw new Error(`Refresh HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Refresh failed');
  return { tokenPreview: j.tokenPreview, expiresAt: j.expiresAt };
}

// ─── Events (Universal Event Bus observability) ──────────────

export interface SovereignEventView {
  event_type: string;
  source: string;
  payload: unknown;
  correlation_id?: string;
  timestamp: number;
}

export interface RecentEventsResponse {
  ok: boolean;
  count: number;
  events: SovereignEventView[];
}

export async function getRecentEvents(limit: number = 100): Promise<SovereignEventView[]> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/events/recent?limit=${Math.max(1, Math.min(500, limit))}`);
  if (!r.ok) throw new Error(`Events HTTP ${r.status}`);
  const j = (await r.json()) as RecentEventsResponse;
  if (!j.ok) throw new Error('Events request failed');
  return j.events;
}

// ─── Chat history (persistence) ──────────────────────────────

export interface ChatHistoryMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatSessionView {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export async function getChatHistory(
  sessionId: string = 'default',
  limit: number = 50,
): Promise<ChatHistoryMessage[]> {
  const base = await getBaseUrl();
  const url = `${base}/chat/sessions/${encodeURIComponent(sessionId)}/messages?limit=${limit}`;
  const r = await fetch(url);
  if (r.status === 404) return []; // session doesn't exist yet — treat as empty
  if (!r.ok) throw new Error(`History HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'History fetch failed');
  return j.messages as ChatHistoryMessage[];
}

export async function listChatSessions(): Promise<ChatSessionView[]> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/chat/sessions`);
  if (!r.ok) throw new Error(`Sessions HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Sessions fetch failed');
  return j.sessions as ChatSessionView[];
}

// ─── Workspace file operations (uses the /file/* HTTP routes) ─

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'other';
  size: number;
  modifiedAt: string;
}

export interface FileListResult {
  path: string;
  entries: FileEntry[];
}

export interface FileReadResult {
  path: string;
  size: number;
  content: string;
}

export async function listFiles(path: string): Promise<FileListResult> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/file/list`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!r.ok) throw new Error(`List HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'List failed');
  return j.result as FileListResult;
}

export async function readFile(path: string): Promise<FileReadResult> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/file/read`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!r.ok) throw new Error(`Read HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Read failed');
  return j.result as FileReadResult;
}

// ─── Debug: current auth values ──────────────────────────────

export interface AuthInfo {
  path: string;
  mode: 'masked' | 'full';
  values: {
    bearerToken: string | null;
    cookies: string | null;
    hifLeim: string | null;
    hifDliq: string | null;
    deviceId: string | null;
  };
}

export async function getAuthInfo(full: boolean = false): Promise<AuthInfo> {
  const base = await getBaseUrl();
  const url = `${base}/debug/auth-info${full ? '?full=1' : ''}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Auth-info HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Auth-info fetch failed');
  return { path: j.path, mode: j.mode, values: j.values };
}

// ─── Debug: update credentials from the app ───────────────────

export interface UpdateAuthPayload {
  bearerToken: string;
  cookies: string;
  hifLeim?: string;
  hifDliq?: string;
  deviceId?: string;
}

export interface UpdateAuthResult {
  bearerLength: number;
  cookiesLength: number;
  hasHifLeim: boolean;
  hasHifDliq: boolean;
  hasDeviceId: boolean;
  persisted: boolean;
  path: string | null;
}

export async function updateAuthInfo(payload: UpdateAuthPayload): Promise<UpdateAuthResult> {
  const base = await getBaseUrl();
  const r = await fetch(`${base}/deepseek/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Update HTTP ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Update failed');
  return {
    bearerLength: j.stored.bearerLength,
    cookiesLength: j.stored.cookiesLength,
    hasHifLeim: j.stored.hasHifLeim,
    hasHifDliq: j.stored.hasHifDliq,
    hasDeviceId: j.stored.hasDeviceId,
    persisted: j.persisted,
    path: j.path,
  };
}
