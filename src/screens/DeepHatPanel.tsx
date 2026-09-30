// DeepHat credentials panel. Mirrors KimiPanel structure.
// Light theme. Talks to /deephad/* endpoints.
// Cookies come from a browser export (JSON array) or a raw header string.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import {
  getDeepHatHealth, getDeepHatCredRaw, saveDeepHatCreds, clearDeepHatCreds,
  normalizeCookiesInput,
  type DeepHatHealth, type DeepHatCredRaw,
} from '../services/deephadApi';
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
  placeholder?: string;
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
        placeholder={props.placeholder || ('new ' + props.label)}
        placeholderTextColor={lovable.textDim}
      />
    </View>
  );
}

export function DeepHatPanel() {
  const [info, setInfo] = useState<DeepHatCredRaw | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [health, setHealth] = useState<DeepHatHealth | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true); setHealthErr(null);
    try { setHealth(await getDeepHatHealth()); }
    catch (e) { setHealthErr(e instanceof Error ? e.message : String(e)); }
    finally { setHealthLoading(false); }
  }, []);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  const load = useCallback(async (full: boolean) => {
    setLoading(true); setError(null); setSaved(null);
    try {
      const r = await getDeepHatCredRaw();
      setInfo(r); setRevealed(full); setMode('view');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  const beginEdit = useCallback(async () => {
    setLoading(true); setError(null); setSaved(null);
    try {
      const r = await getDeepHatCredRaw().catch(() => null);
      if (r) setInfo(r);
      setDraft(r?.cookies ?? '');
      setMode('edit'); setRevealed(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  const cancelEdit = useCallback(() => { setMode('view'); setError(null); setSaved(null); }, []);

  const save = useCallback(async () => {
    const cookies = normalizeCookiesInput(draft);
    if (!cookies) { setError('cookies are required'); return; }
    setSaving(true); setError(null); setSaved(null);
    try {
      const r = await saveDeepHatCreds({ cookies });
      setSaved('saved · cookies=' + r.cookiesLength);
      await refreshHealth();
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }, [draft, load, refreshHealth]);

  const wipe = useCallback(async () => {
    setSaving(true); setError(null); setSaved(null);
    try {
      await clearDeepHatCreds();
      setSaved('credentials cleared');
      setInfo(null); setMode('idle');
      await refreshHealth();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }, [refreshHealth]);

  const gatewayState: 'ok' | 'bad' | 'unknown' =
    !health ? 'unknown' : health.gatewayOk === true ? 'ok' : 'bad';
  const cookiesState: 'ok' | 'bad' | 'unknown' =
    !health ? 'unknown' : health.configured ? 'ok' : 'bad';
  const lastCallState: 'ok' | 'bad' | 'unknown' =
    !health || health.lastCallOk === null || health.lastCallOk === undefined ? 'unknown'
    : health.lastCallOk ? 'ok' : 'bad';

  const healthLine = health
    ? 'Last call: ' + (health.lastCallAt ? new Date(health.lastCallAt).toLocaleTimeString() : 'never')
      + '  ·  ' + (health.lastCallOk === null || health.lastCallOk === undefined ? '—' : (health.lastCallOk ? 'OK' : 'FAILED'))
    : (healthErr ? healthErr : 'checking…');

  const gatewayLine = health?.gatewayUrl
    ? 'Gateway: ' + health.gatewayUrl + (health.gatewayError ? '  ·  ' + health.gatewayError : '')
    : '';

  return (
    <View style={s.panel}>
      <Text style={s.h1}>DeepHat Auth</Text>
      <Text style={s.sub}>
        {mode === 'edit'
          ? 'Paste a cookie JSON export or raw cookie header, then tap Save.'
          : 'Cookie-only session via the local Deno gateway on 8089.'}
      </Text>

      <View style={s.statusPills}>
        <StatusPill label="GATEWAY" state={gatewayState} sub={health ? (health.gatewayOk ? 'ok' : 'down') : '—'} />
        <StatusPill label="COOKIES" state={cookiesState} sub={health ? (health.configured ? 'set' : 'missing') : '—'} />
        <StatusPill label="LAST CALL" state={lastCallState} sub={
          health && health.lastCallAt ? new Date(health.lastCallAt).toLocaleTimeString() : '—'
        } />
      </View>

      <View style={s.healthRow}>
        <Text style={s.healthText} numberOfLines={1}>{healthLine}</Text>
        <Pressable onPress={() => void refreshHealth()} disabled={healthLoading} style={[s.healthBtn, healthLoading && { opacity: 0.5 }]}>
          <Text style={s.healthBtnText}>{healthLoading ? '…' : 'Verify now'}</Text>
        </Pressable>
      </View>

      {gatewayLine ? <Text style={s.metaLine}>{gatewayLine}</Text> : null}

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
          <Field
            label="cookies"
            value={draft}
            onChange={setDraft}
            tall
            placeholder="paste a JSON array OR name=value; name=value; ..."
          />
          <View style={s.btnRow}>
            <Pressable onPress={wipe} disabled={saving} style={[s.btn, s.btnDanger, saving && s.btnDisabled]}>
              <Text style={s.btnTextDanger}>Clear credentials</Text>
            </Pressable>
          </View>
          <View style={s.warnBox}>
            <Text style={s.warnText}>
              ⚠ Accepts either a browser cookie-export JSON array (the format that lands in ~/storage/downloads/cookie*.json) or a raw cookie header. Stored at ~/cookies/deephad-creds.json with mode 0600.
            </Text>
          </View>
        </>
      ) : info ? (
        <>
          <View style={s.row}>
            <Text style={s.rowKey}>cookies</Text>
            <Text style={[s.rowVal, !info.cookies && { color: lovable.textDim, fontStyle: 'italic' }]} selectable numberOfLines={6}>
              {info.cookies ? (revealed ? info.cookies : info.cookies.slice(0, 40) + '…') : '(not set)'}
            </Text>
          </View>
          {info.acquiredAt ? (
            <View style={s.row}>
              <Text style={s.rowKey}>acquiredAt</Text>
              <Text style={s.rowVal} selectable>{new Date(info.acquiredAt).toLocaleString()}</Text>
            </View>
          ) : null}
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
  fieldInputTall: { minHeight: 200, textAlignVertical: 'top' },

  warnBox: {
    marginTop: 14, padding: 10, borderRadius: 8,
    backgroundColor: lovable.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
  },
  warnText: { color: lovable.warning, fontSize: 11, lineHeight: 16 },
});
