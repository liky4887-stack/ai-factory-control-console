import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import {
  getAuthInfo, updateAuthInfo, deepseekHealth,
  type AuthInfo, type DeepSeekHealth,
} from '../services/deepseekApi';
import { theme } from '../theme';

type Mode = 'idle' | 'view' | 'edit';

interface Draft {
  bearerToken: string;
  cookies: string;
  hifLeim: string;
  hifDliq: string;
  deviceId: string;
}

const EMPTY: Draft = { bearerToken: '', cookies: '', hifLeim: '', hifDliq: '', deviceId: '' };

function StatusPill(props: {
  label: string;
  state: 'ok' | 'bad' | 'unknown';
  sub: string;
}) {
  const color =
    props.state === 'ok' ? '#44ff88' :
    props.state === 'bad' ? '#ff5555' : theme.textMuted;
  const bg =
    props.state === 'ok' ? 'rgba(68,255,136,0.10)' :
    props.state === 'bad' ? 'rgba(255,85,85,0.10)' : 'rgba(255,255,255,0.04)';
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
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
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
        autoCapitalize="none"
        autoCorrect={false}
        style={[s.fieldInput, props.multiline && s.fieldInputMulti]}
        placeholder={'new ' + props.label}
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

export function AuthDebugPanel() {
  const [info, setInfo] = useState<AuthInfo | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [revealed, setRevealed] = useState(false);
  const [health, setHealth] = useState<DeepSeekHealth | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthErr(null);
    try {
      const h = await deepseekHealth();
      setHealth(h);
    } catch (e) {
      setHealthErr(e instanceof Error ? e.message : String(e));
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  const load = useCallback(async (full: boolean) => {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const r = await getAuthInfo(full);
      setInfo(r);
      setRevealed(full);
      setMode('view');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const beginEdit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const r = await getAuthInfo(true);
      setInfo(r);
      setDraft({
        bearerToken: r.values.bearerToken ?? '',
        cookies: r.values.cookies ?? '',
        hifLeim: r.values.hifLeim ?? '',
        hifDliq: r.values.hifDliq ?? '',
        deviceId: r.values.deviceId ?? '',
      });
      setMode('edit');
      setRevealed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelEdit = useCallback(() => {
    setMode('view');
    setError(null);
    setSaved(null);
  }, []);

  const save = useCallback(async () => {
    if (!draft.bearerToken.trim() || !draft.cookies.trim()) {
      setError('bearerToken and cookies are required');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const r = await updateAuthInfo({
        bearerToken: draft.bearerToken.trim(),
        cookies: draft.cookies.trim(),
        hifLeim: draft.hifLeim.trim() || undefined,
        hifDliq: draft.hifDliq.trim() || undefined,
        deviceId: draft.deviceId.trim() || undefined,
      });
      setSaved(
        'saved · bearer=' + r.bearerLength +
        ' cookies=' + r.cookiesLength +
        ' · persisted=' + r.persisted
      );
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [draft, load]);

  const rows: Array<[string, string | null]> = info
    ? [
        ['bearerToken', info.values.bearerToken],
        ['cookies', info.values.cookies],
        ['hifLeim', info.values.hifLeim],
        ['hifDliq', info.values.hifDliq],
        ['deviceId', info.values.deviceId],
      ]
    : [];

  const bearerState: 'ok' | 'bad' | 'unknown' =
    health?.bearerValid === true ? 'ok' :
    health?.bearerValid === false ? 'bad' : 'unknown';
  const cookieState: 'ok' | 'bad' | 'unknown' =
    health && health.cookiesLength > 0 ? 'ok' :
    health ? 'bad' : 'unknown';
  const hifCount = health
    ? (health.hasHifLeim ? 1 : 0) + (health.hasHifDliq ? 1 : 0) + (health.hasDeviceId ? 1 : 0)
    : 0;
  const hifState: 'ok' | 'bad' | 'unknown' =
    health ? (hifCount === 3 ? 'ok' : 'bad') : 'unknown';

  const healthLine = health
    ? 'Last chat: ' +
      (health.lastChatAt ? new Date(health.lastChatAt).toLocaleTimeString() : 'never') +
      '  ·  ' +
      (health.lastChatOk === null ? '—' : (health.lastChatOk ? 'OK' : 'FAILED'))
    : (healthErr ? healthErr : 'checking…');

  return (
    <View style={s.root}>
      <Text style={s.h1}>Auth Debug</Text>
      <Text style={s.sub}>
        {mode === 'edit'
          ? 'Edit mode — paste new values, then tap Save'
          : 'Inspect the credentials file the backend loaded at boot'}
      </Text>

      <View style={s.statusPills}>
        <StatusPill label="BEARER" state={bearerState} sub={health ? health.bearerLength + ' chars' : '—'} />
        <StatusPill label="COOKIE" state={cookieState} sub={health ? health.cookiesLength + ' chars' : '—'} />
        <StatusPill label="HIF" state={hifState} sub={health ? hifCount + '/3' : '—'} />
      </View>

      <View style={s.healthRow}>
        <Text style={s.healthText} numberOfLines={1}>{healthLine}</Text>
        <Pressable
          onPress={() => void refreshHealth()}
          disabled={healthLoading}
          style={[s.healthBtn, healthLoading && { opacity: 0.5 }]}
        >
          <Text style={s.healthBtnText}>{healthLoading ? '…' : 'Verify now'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={s.err}>● {error}</Text> : null}
      {saved ? <Text style={s.ok}>● {saved}</Text> : null}

      {mode !== 'edit' ? (
        <View style={s.btnRow}>
          <Pressable onPress={() => load(false)} disabled={loading} style={[s.btn, loading && s.btnDisabled]}>
            <Text style={s.btnText}>{loading ? '…' : 'Load (masked)'}</Text>
          </Pressable>
          <Pressable onPress={() => load(true)} disabled={loading} style={[s.btn, s.btnWarn, loading && s.btnDisabled]}>
            <Text style={[s.btnText, s.btnTextWarn]}>{loading ? '…' : 'Reveal full'}</Text>
          </Pressable>
          <Pressable onPress={beginEdit} disabled={loading} style={[s.btn, s.btnEdit, loading && s.btnDisabled]}>
            <Text style={[s.btnText, s.btnTextEdit]}>{loading ? '…' : 'Edit'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.btnRow}>
          <Pressable onPress={save} disabled={saving} style={[s.btn, s.btnSave, saving && s.btnDisabled]}>
            <Text style={s.btnText}>{saving ? '…' : 'Save'}</Text>
          </Pressable>
          <Pressable onPress={cancelEdit} disabled={saving} style={[s.btn, s.btnWarn, saving && s.btnDisabled]}>
            <Text style={[s.btnText, s.btnTextWarn]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {loading ? <ActivityIndicator color={theme.cyan} style={{ marginTop: 12 }} /> : null}

      {mode === 'edit' ? (
        <>
          <Field label="bearerToken" value={draft.bearerToken} onChange={(v) => setDraft({ ...draft, bearerToken: v })} multiline />
          <Field label="cookies" value={draft.cookies} onChange={(v) => setDraft({ ...draft, cookies: v })} multiline />
          <Field label="hifLeim" value={draft.hifLeim} onChange={(v) => setDraft({ ...draft, hifLeim: v })} />
          <Field label="hifDliq" value={draft.hifDliq} onChange={(v) => setDraft({ ...draft, hifDliq: v })} />
          <Field label="deviceId" value={draft.deviceId} onChange={(v) => setDraft({ ...draft, deviceId: v })} />
          <View style={s.warnBox}>
            <Text style={s.warnText}>
              ⚠ Saving overwrites the live credentials file. If the new values
              are wrong, chat will fail until valid ones are entered. For
              automatic timestamped backups, use scripts/edit_auth.sh in Termux.
            </Text>
          </View>
        </>
      ) : info ? (
        <>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>source</Text>
            <Text style={s.metaValue}>{info.path}</Text>
            <Text style={s.metaLabel}>mode</Text>
            <Text style={[s.metaValue, info.mode === 'full' && { color: theme.amber }]}>
              {info.mode}
            </Text>
          </View>
          {rows.map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text
                style={[s.rowVal, v === null && { color: theme.textMuted, fontStyle: 'italic' }]}
                selectable
              >
                {v === null ? '(not set)' : v}
              </Text>
            </View>
          ))}
          {revealed ? (
            <View style={s.warnBox}>
              <Text style={s.warnText}>
                ⚠ These values are live credentials. Handle them carefully.
                Do not paste them into chat, logs, or screenshots.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: 'transparent' },
  statusPills: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: theme.border,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  pillSub: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  healthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, backgroundColor: 'rgba(8,11,17,0.6)',
    borderWidth: 1, borderColor: theme.border, marginBottom: 10,
  },
  healthText: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  healthBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.cyan },
  healthBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  h1: { color: theme.text, fontSize: 16, fontWeight: '800' },
  sub: { color: theme.textMuted, fontSize: 11, marginTop: 2, marginBottom: 12 },
  err: { color: theme.red, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },
  ok: { color: theme.green, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.cyan, alignItems: 'center' },
  btnWarn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.amber },
  btnEdit: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.cyan },
  btnSave: { backgroundColor: theme.green },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#000', fontWeight: '800', fontSize: 12 },
  btnTextWarn: { color: theme.amber },
  btnTextEdit: { color: theme.cyan },
  metaBox: {
    marginTop: 14, padding: 10, borderRadius: 8,
    backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border,
  },
  metaLabel: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace' },
  metaValue: { color: theme.textSecondary, fontSize: 10, fontFamily: 'monospace', marginBottom: 6 },
  row: {
    marginTop: 8, padding: 10, borderRadius: 8,
    backgroundColor: 'rgba(8,11,17,0.6)',
    borderWidth: 1, borderColor: theme.border,
  },
  rowKey: { color: theme.cyan, fontSize: 10, fontFamily: 'monospace', fontWeight: '700', marginBottom: 4 },
  rowVal: { color: theme.textSecondary, fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  fieldWrap: { marginTop: 10 },
  fieldLabel: { color: theme.cyan, fontSize: 10, fontFamily: 'monospace', fontWeight: '700', marginBottom: 4 },
  fieldInput: {
    backgroundColor: 'rgba(8,11,17,0.7)',
    borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    color: theme.text, fontFamily: 'monospace', fontSize: 11,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  warnBox: {
    marginTop: 14, padding: 10, borderRadius: 8,
    backgroundColor: 'rgba(255,170,51,0.08)',
    borderWidth: 1, borderColor: theme.amber,
  },
  warnText: { color: theme.amber, fontSize: 11, lineHeight: 16 },
});
