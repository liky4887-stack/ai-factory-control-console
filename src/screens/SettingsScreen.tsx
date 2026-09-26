// Settings screen — GitHub credentials for publishing projects.
// Light editorial theme. Talks to /github/* endpoints.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api, type GitHubStatus } from '../services/api';
import { lovable } from '../theme';

interface Props {
  onClose: () => void;
  onOpenSystemPower?: () => void;
}

export function SettingsScreen({ onClose, onOpenSystemPower }: Props) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setErr(null);
    try {
      const s = await api.getGitHubStatus();
      setStatus(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const save = useCallback(async () => {
    const t = token.trim();
    if (!t) return;
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    try {
      const r = await api.setGitHubCredentials({ token: t });
      setOkMsg('Saved. Signed in as @' + r.username);
      setToken('');
      await loadStatus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [token, loadStatus]);

  const clear = useCallback(async () => {
    setClearing(true);
    setErr(null);
    setOkMsg(null);
    try {
      await api.clearGitHubCredentials();
      setOkMsg('GitHub credentials cleared');
      await loadStatus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setClearing(false);
    }
  }, [loadStatus]);

  const configured = status?.configured === true;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Back">
          <Feather name="chevron-left" size={20} color={lovable.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Settings</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionLabel}>GITHUB</Text>
        <View style={s.card}>
          {loadingStatus ? (
            <ActivityIndicator color={lovable.textMuted} style={{ marginVertical: 24 }} />
          ) : (
            <>
              <View style={s.statusRow}>
                <View style={[
                  s.statusDot,
                  { backgroundColor: configured ? lovable.success : lovable.textDim },
                ]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.statusLabel}>
                    {configured ? 'Connected' : 'Not connected'}
                  </Text>
                  <Text style={s.statusSub} numberOfLines={1}>
                    {configured && status?.username
                      ? '@' + status.username + '  ·  token ' + status.tokenLength + ' chars'
                      : 'Paste a personal access token below'}
                  </Text>
                </View>
              </View>

              <Text style={s.hint}>
                Create a token at github.com/settings/tokens with the{' '}
                <Text style={s.hintMono}>repo</Text> scope. It stays on this device only.
              </Text>

              <View style={s.inputWrap}>
                <Feather name="key" size={14} color={lovable.textMuted} />
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  placeholderTextColor={lovable.textDim}
                  style={s.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showToken}
                  editable={!saving}
                />
                <Pressable
                  onPress={() => setShowToken((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel={showToken ? 'Hide token' : 'Show token'}
                >
                  <Feather
                    name={showToken ? 'eye-off' : 'eye'}
                    size={14}
                    color={lovable.textMuted}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[s.primaryBtn, (!token.trim() || saving) && s.primaryDisabled]}
                onPress={() => void save()}
                disabled={!token.trim() || saving}
                accessibilityLabel="Save token"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.primaryBtnText}>Save token</Text>
                )}
              </Pressable>

              {configured ? (
                <Pressable
                  style={[s.outlineBtn, clearing && { opacity: 0.5 }]}
                  onPress={() => void clear()}
                  disabled={clearing}
                  accessibilityLabel="Disconnect GitHub"
                >
                  <Feather name="trash-2" size={13} color={lovable.error} />
                  <Text style={s.outlineBtnText}>
                    {clearing ? 'Clearing...' : 'Disconnect'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}

          {err ? <Text style={s.err}>{'\u2022'} {err}</Text> : null}
          {okMsg ? <Text style={s.ok}>{'\u2022'} {okMsg}</Text> : null}
        </View>

        {onOpenSystemPower ? (
          <>
            <Text style={s.sectionLabel}>SYSTEM</Text>
            <View style={s.card}>
              <Pressable
                style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                onPress={onOpenSystemPower}
                accessibilityLabel="Open System Power"
              >
                <Feather name="activity" size={16} color={lovable.textMuted} />
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>System Power</Text>
                  <Text style={s.rowSub}>Host metrics, toggles, live auth debug</Text>
                </View>
                <Feather name="chevron-right" size={18} color={lovable.textMuted} />
              </Pressable>
            </View>
          </>
        ) : null}

        <Text style={s.footer}>
          Sovereign Factory · everything local to this device
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },

  content: {
    padding: lovable.space.md,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.8,
    marginTop: lovable.space.md,
    marginBottom: lovable.space.sm,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.lg,
    padding: lovable.space.md,
    gap: lovable.space.sm,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  statusSub: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 2,
  },
  hint: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    lineHeight: 19,
    marginTop: lovable.space.xs,
  },
  hintMono: {
    fontFamily: 'monospace',
    color: lovable.text,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: lovable.input,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    borderRadius: 12,
    paddingHorizontal: lovable.space.sm + 4,
    marginTop: lovable.space.sm,
  },
  input: {
    flex: 1,
    color: lovable.text,
    paddingVertical: 12,
    fontSize: lovable.font.sm,
    fontFamily: 'monospace',
  },

  primaryBtn: {
    backgroundColor: lovable.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: lovable.space.sm,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: lovable.weight.semibold,
    fontSize: lovable.font.md,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: 999,
    paddingVertical: 10,
    marginTop: lovable.space.xs,
  },
  outlineBtnText: {
    color: lovable.error,
    fontWeight: lovable.weight.medium,
    fontSize: lovable.font.sm,
  },

  err: {
    color: lovable.error,
    fontSize: lovable.font.xs,
    marginTop: lovable.space.sm,
  },
  ok: {
    color: lovable.success,
    fontSize: lovable.font.xs,
    marginTop: lovable.space.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingVertical: 4,
  },
  rowBody: { flex: 1 },
  rowLabel: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  rowSub: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 2,
  },

  footer: {
    color: lovable.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: lovable.space.xxl,
  },
});
