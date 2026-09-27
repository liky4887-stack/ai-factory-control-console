// Kimi credentials panel. Mirrors QwenPanel structure.
// Light theme. Talks to /kimi/* endpoints.
// extraHeaders is hidden from the UI by design — set via curl if needed.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import {
  getKimiHealth, getKimiCredRaw, saveKimiCreds, clearKimiCreds,
  type KimiHealth, type KimiCredRaw,
} from '../services/kimiApi';
import { lovable } from '../theme';

type Mode = 'idle' | 'view' | 'edit';

function StatusPill(props: { label: string; state: 'ok' | 'bad' | 'unknown'; sub: string }) {
  const color =
    props.state === 'ok' ? lovable.success :
    props.state === 'bad' ? lovable.error : lovable.textMuted;
  const bg =
    props.state === 'ok' ? lovable.successSoft :
    props.state === 'bad' ? lovable.errorSoft : lovable.pillBg;
  const border =
    props.state === 'ok' ? 'rgba(22,163,74,0.22)' :
    props.state === 'bad' ? 'rgba(220,38,38,0.22)' : lovable.cardBorder;
  return (
    <View style={[s.pill, { backgroundColor: bg, borderColor: border }]}>
      <View style={[s.pillDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.pillLabel, { color }]}>{props.label}</Text>
        <Text style={s.pillSub} numberOfLines={1}>{props.sub}</Text>
      </View>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  tall?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline || props.tall}
        autoCapitalize="none"
        autoCorrect={false}
        style={[s.fieldInput, props.tall && s.fieldInputTall, props.multiline && !props.tall && s.fieldInputMulti]}
        placeholder={'new ' + props.label}
        placeholderTextColor={lovable.textDim}
      />
    </View>
  );
}

interface KimiDraft {
  cookies: string;
  bearerToken: string;
  csrfToken: string;
}
const EMPTY: KimiDraft = { cookies: '', bearerToken: '', csrfToken: '' };

export function KimiPanel() {
  const [info, setInfo] = useState<KimiCredRaw | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState<KimiDraft>(EMPTY);
  const [revealed, setRevealed] = useState(false);
  const [health, setHealth] = useState<KimiHealth | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true); setHealthErr(null);
    try { setHealth(await getKimiHealth()); }
    catch (e) { setHealthErr(e instanceof Error ? e.message : String(e)); }
    finally { setHealthLoading(false); }
  }, []);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  const load = useCallback(async (full: boolean) => {
    setLoading(true); setError(null); setSaved(null);
    try {
      const r = await getKimiCredRaw();
      setInfo(r); setRevealed(full); setMode('view');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  const beginEdit = useCallback(async () => {
    setLoading(true); setError(null); setSaved(null);
    try {
      const r = await getKimiCredRaw().catch(() => null);
      if (r) setInfo(r);
      setDraft({
        cookies: r?.cookies ?? '',
        bearerToken: r?.bearerToken ?? '',
        csrfToken: r?.csrfToken ?? '',
      });
      setMode('edit'); setRevealed(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  const cancelEdit = useCallback(() => { setMode('view'); setError(null); setSaved(null); }, []);

  const save = useCallback(async () => {
    if (!draft.cookies.trim()) {
      setError('cookies are required'); return;
    }
    setSaving(true); setError(null); setSaved(null);
    try {
      const r = await saveKimiCreds({
        cookies: draft.cookies.trim(),
        bearerToken: draft.bearerToken.trim() || undefined,
        csrfToken: draft.csrfToken.trim() || undefined,
      });
      setSaved('saved · cookies=' + r.cookiesLength + ' · bearer=' + r.hasBearer + ' · csrf=' + r.hasCsrf);
      await refreshHealth();
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }, [draft, load, refreshHealth]);

  const wipe = useCallback(async () => {
    setSaving(true); setError(null); setSaved(null);
    try {
      await clearKimiCreds();
      setSaved('credentials cleared');
      setInfo(null); setMode('idle');
      await refreshHealth();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }, [refreshHealth]);

  const rows: Array<[string, string | null]> = info ? [
    ['cookies', info.cookies],
    ['bearerToken', info.bearerToken],
    ['csrfToken', info.csrfToken],
  ] : [];

  const cookieState: 'ok' | 'bad' | 'unknown' =
    health && (health.cookiesLength ?? 0) > 0 ? 'ok' : health ? 'bad' : 'unknown';
  const bearerState: 'ok' | 'bad' | 'unknown' =
    health ? (health.hasBearer ? 'ok' : 'unknown') : 'unknown';
  const csrfState: 'ok' | 'bad' | 'unknown' =
    health ? (health.hasCsrf ? 'ok' : 'unknown') : 'unknown';

  const wafState = health?.wafState;
  const throttleState = health?.throttleState;

  const healthLine = health
    ? 'Last call: ' + (health.lastCallAt ? new Date(health.lastCallAt).toLocaleTimeString() : 'never')
      + '  ·  ' + (health.lastCallOk === null || health.lastCallOk === undefined ? '—' : (health.lastCallOk ? 'OK' : 'FAILED'))
    : (healthErr ? healthErr : 'checking…');

  const wafLine = wafState
    ? (wafState.state === 'closed'
        ? 'WAF: closed · ' + wafState.totalTrips + ' trips'
        : 'WAF: ' + wafState.state + ' · ' + Math.ceil(wafState.cooldownRemainingMs / 60000) + 'min left')
    : '';

  const throttleLine = throttleState
    ? 'Throttle: ' + throttleState.recentCount + '/' + throttleState.maxPerDay + ' today'
      + ' · gap ' + Math.ceil(throttleState.effectiveGapSeconds / 60) + 'min'
      + (throttleState.nextAllowedInMs > 0 ? ' · next in ' + Math.ceil(throttleState.nextAllowedInMs / 1000) + 's' : '')
    : '';

  return (
    <View style={s.panel}>
      <Text style={s.h1}>Kimi Auth</Text>
      <Text style={s.sub}>{mode === 'edit' ? 'Edit mode — paste fresh cookies from browser, then tap Save' : 'Cookie-only session. No API keys.'}</Text>

      <View style={s.statusPills}>
        <StatusPill label="COOKIES" state={cookieState} sub={health ? (health.cookiesLength ?? 0) + ' chars' : '—'} />
        <StatusPill label="BEARER" state={bearerState} sub={health ? (health.hasBearer ? 'set' : 'not set') : '—'} />
        <StatusPill label="CSRF" state={csrfState} sub={health ? (health.hasCsrf ? 'set' : 'not set') : '—'} />
      </View>

      <View style={s.healthRow}>
        <Text style={s.healthText} numberOfLines={1}>{healthLine}</Text>
        <Pressable onPress={() => void refreshHealth()} disabled={healthLoading} style={[s.healthBtn, healthLoading && { opacity: 0.5 }]}>
          <Text style={s.healthBtnText}>{healthLoading ? '…' : 'Verify now'}</Text>
        </Pressable>
      </View>

      {wafLine ? <Text style={s.metaLine}>{wafLine}</Text> : null}
      {throttleLine ? <Text style={s.metaLine}>{throttleLine}</Text> : null}

      {error ? <Text style={s.err}>● {error}</Text> : null}
      {saved ? <Text style={s.ok}>● {saved}</Text> : null}

      {mode !== 'edit' ? (
        <View style={s.btnRow}>
          <Pressable onPress={() => load(false)} disabled={loading} style={[s.btn, s.btnPrimary, loading && s.btnDisabled]}>
            <Text style={s.btnTextPrimary}>{loading ? '…' : 'Load (masked)'}</Text>
          </Pressable>
          <Pressable onPress={() => load(true)} disabled={loading} style={[s.btn, s.btnOutline, loading && s.btnDisabled]}>
            <Text style={s.btnTextOutline}>{loading ? '…' : 'Reveal full'}</Text>
          </Pressable>
          <Pressable onPress={beginEdit} disabled={loading} style={[s.btn, s.btnOutline, loading && s.btnDisabled]}>
            <Text style={s.btnTextOutline}>{loading ? '…' : 'Edit'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.btnRow}>
          <Pressable onPress={save} disabled={saving} style={[s.btn, s.btnPrimary, saving && s.btnDisabled]}>
            <Text style={s.btnTextPrimary}>{saving ? '…' : 'Save'}</Text>
          </Pressable>
          <Pressable onPress={cancelEdit} disabled={saving} style={[s.btn, s.btnOutline, saving && s.btnDisabled]}>
            <Text style={s.btnTextOutline}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {loading ? <ActivityIndicator color={lovable.textMuted} style={{ marginTop: 12 }} /> : null}

      {mode === 'edit' ? (
        <>
          <Field label="cookies" value={draft.cookies} onChange={(v) => setDraft({ ...draft, cookies: v })} tall />
          <Field label="bearerToken" value={draft.bearerToken} onChange={(v) => setDraft({ ...draft, bearerToken: v })} multiline />
          <Field label="csrfToken" value={draft.csrfToken} onChange={(v) => setDraft({ ...draft, csrfToken: v })} />
          <View style={s.btnRow}>
            <Pressable onPress={wipe} disabled={saving} style={[s.btn, s.btnDanger, saving && s.btnDisabled]}>
              <Text style={s.btnTextDanger}>Clear credentials</Text>
            </Pressable>
          </View>
          <View style={s.warnBox}>
            <Text style={s.warnText}>
              ⚠ Paste cookies exported from a real Kimi browser session. No API keys. Invisible Man throttle enforces 15-minute gaps and a 30/day cap.
            </Text>
          </View>
        </>
      ) : info ? (
        <>
          {rows.map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={[s.rowVal, v === null && { color: lovable.textDim, fontStyle: 'italic' }]} selectable numberOfLines={6}>
                {v === null ? '(not set)' : (revealed ? v : String(v).slice(0, 40) + '…')}
              </Text>
            </View>
          ))}
          {revealed ? (
            <View style={s.warnBox}>
              <Text style={s.warnText}>⚠ These values are live session credentials. Handle carefully.</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: 0 },
  h1: { color: lovable.text, fontSize: lovable.font.lg, fontWeight: lovable.weight.bold },
  sub: { color: lovable.textMuted, fontSize: lovable.font.sm, marginTop: 2, marginBottom: 12 },

  statusPills: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: { fontSize: 10, fontWeight: lovable.weight.extrabold, letterSpacing: 0.6 },
  pillSub: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 1 },

  healthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, backgroundColor: lovable.pillBg,
    borderWidth: 1, borderColor: lovable.cardBorder, marginBottom: 6,
  },
  healthText: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  healthBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: lovable.accent },
  healthBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: lovable.weight.bold },
  metaLine: { color: lovable.textDim, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },

  err: { color: lovable.error, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },
  ok: { color: lovable.success, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },

  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: lovable.accent },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: lovable.cardBorder },
  btnDanger: { backgroundColor: lovable.errorSoft, borderWidth: 1, borderColor: 'rgba(220,38,38,0.22)' },
  btnDisabled: { opacity: 0.5 },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: lovable.weight.bold, fontSize: 12 },
  btnTextOutline: { color: lovable.text, fontWeight: lovable.weight.semibold, fontSize: 12 },
  btnTextDanger: { color: lovable.error, fontWeight: lovable.weight.semibold, fontSize: 12 },

  row: {
    marginTop: 8, padding: 10, borderRadius: 8,
    backgroundColor: lovable.pillBg, borderWidth: 1, borderColor: lovable.cardBorder,
  },
  rowKey: { color: lovable.text, fontSize: 10, fontFamily: 'monospace', fontWeight: lovable.weight.bold, marginBottom: 4 },
  rowVal: { color: lovable.textMuted, fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },

  fieldWrap: { marginTop: 10 },
  fieldLabel: { color: lovable.text, fontSize: 10, fontFamily: 'monospace', fontWeight: lovable.weight.bold, marginBottom: 4 },
  fieldInput: {
    backgroundColor: lovable.input, borderWidth: 1, borderColor: lovable.inputBorder,
    borderRadius: 8, color: lovable.text, fontFamily: 'monospace', fontSize: 11,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  fieldInputTall: { minHeight: 160, textAlignVertical: 'top' },

  warnBox: {
    marginTop: 14, padding: 10, borderRadius: 8,
    backgroundColor: lovable.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
  },
  warnText: { color: lovable.warning, fontSize: 11, lineHeight: 16 },
});
