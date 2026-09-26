import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listAllSkills, importSkillFromUrl, getBaseUrl,
  type BackendSkill,
} from '../services/deepseekApi';
import { lovable } from '../theme';

interface Props {
  projectId: string | null;
  projectTitle: string | null;
  onDone: () => void;
  onClose: () => void;
}

interface AppliedResult {
  skillId: string;
  ok: boolean;
  summary?: string;
  error?: string;
  at: number;
}

function iconFor(id: string): string {
  if (id.includes('responsive')) return '\u25EB';
  if (id.includes('dark')) return '\u25D0';
  if (id.includes('seo')) return '\u2315';
  if (id.includes('contact') || id.includes('form')) return '\u2709';
  if (id.includes('favicon') || id.includes('pwa')) return '\u25C8';
  if (id.includes('analytic')) return '\u2341';
  if (id.includes('animation')) return '\u2726';
  if (id.includes('accessib')) return '\u25CE';
  return '\u2726';
}

export function SkillsScreen({ projectId, projectTitle, onDone, onClose }: Props) {
  const [skills, setSkills] = useState<BackendSkill[] | null>(null);
  const [status, setStatus] = useState<{
    configured: boolean; lastError: string | null; loadedAt: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busySkill, setBusySkill] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedResult[]>([]);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const r = await listAllSkills();
      setSkills(r.skills || []);
      setStatus({ configured: r.configured, lastError: r.lastError, loadedAt: r.loadedAt });
    } catch (e) {
      setSkills([]);
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const apply = useCallback(async (skill: BackendSkill) => {
    if (!projectId) { setApplyErr('Open a project first.'); return; }
    if (busySkill) return;
    setBusySkill(skill.id);
    setApplyErr(null);
    try {
      const base = await getBaseUrl();
      const prompt = skill.label + ': apply this skill to the project.';
      const r = await fetch(
        base + '/projects/' + encodeURIComponent(projectId) + '/build',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        }
      );
      const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }));
      if (!j.ok) throw new Error(j.error || 'build failed');
      setApplied((prev) => [
        { skillId: skill.id, ok: true, summary: j.result.summary, at: Date.now() },
        ...prev,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setApplied((prev) => [
        { skillId: skill.id, ok: false, error: msg, at: Date.now() },
        ...prev,
      ]);
    } finally {
      setBusySkill(null);
    }
  }, [projectId, busySkill]);

  const doImport = useCallback(async () => {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const skill = await importSkillFromUrl(url);
      setImportMsg('Imported: ' + skill.label + ' (' + skill.bytes + 'B)');
      setImportUrl('');
      await load();
    } catch (e) {
      setImportMsg('Import failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
    }
  }, [importUrl, importing, load]);

  const list = skills ?? [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Close">
          <Text style={s.headerIcon}>{'\u2715'}</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Skills</Text>
        </View>
        <Pressable onPress={load} style={s.headerBtn} disabled={loading} accessibilityLabel="Refresh">
          <Text style={[s.headerIcon, loading && { opacity: 0.4 }]}>{'\u21BB'}</Text>
        </Pressable>
      </View>

      <View style={s.subbar}>
        <Text style={s.subbarLabel}>TARGET PROJECT</Text>
        <Text style={s.subbarValue} numberOfLines={1}>
          {projectTitle || 'No project open'}
        </Text>
      </View>

      <View style={s.importRow}>
        <TextInput
          value={importUrl}
          onChangeText={setImportUrl}
          placeholder="Paste skill URL (raw or blob)..."
          placeholderTextColor={lovable.textDim}
          style={s.importInput}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!importing}
        />
        <Pressable
          onPress={() => void doImport()}
          disabled={importing || !importUrl.trim()}
          style={[s.importBtn, (importing || !importUrl.trim()) && { opacity: 0.4 }]}
        >
          {importing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.importBtnText}>Import</Text>}
        </Pressable>
      </View>
      {importMsg ? <Text style={s.importMsg}>{importMsg}</Text> : null}

      <View style={s.statusRow}>
        <Text style={s.statusText} numberOfLines={1}>
          {loading
            ? 'loading...'
            : loadErr
            ? 'backend error: ' + loadErr
            : status
            ? list.length + ' skill' + (list.length === 1 ? '' : 's') +
              (status.loadedAt ? ' \u00B7 ' + new Date(status.loadedAt).toLocaleTimeString() : '')
            : '\u2014'}
        </Text>
      </View>

      {applyErr ? <Text style={s.err}>{'\u2022'} {applyErr}</Text> : null}

      <ScrollView contentContainerStyle={s.list}>
        {loading && list.length === 0 ? (
          <ActivityIndicator color={lovable.accent} style={{ marginTop: lovable.space.lg }} />
        ) : list.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No skills loaded</Text>
            <Text style={s.emptyBody}>
              {loadErr
                ? 'Backend unreachable. Check that ~/start-factory.sh is running.'
                : 'Catalogue is empty. Paste a URL above and tap Import.'}
            </Text>
          </View>
        ) : (
          list.map((skill) => {
            const isBusy = busySkill === skill.id;
            const disabled = !projectId || !!busySkill;
            return (
              <Pressable
                key={skill.id}
                onPress={() => void apply(skill)}
                disabled={disabled}
                style={({ pressed }) => [
                  s.card,
                  disabled && { opacity: 0.5 },
                  pressed && !disabled && { opacity: 0.75 },
                ]}
              >
                <View style={s.iconBox}>
                  <Text style={s.iconGlyph}>{iconFor(skill.id)}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{skill.label}</Text>
                  <Text style={s.cardDesc} numberOfLines={2}>{skill.description}</Text>
                  <Text style={s.cardSource} numberOfLines={1}>
                    {skill.id} {'\u00B7'} {skill.bytes}B
                  </Text>
                </View>
                <View style={s.cardRight}>
                  {isBusy
                    ? <ActivityIndicator color={lovable.accent} size="small" />
                    : <Text style={s.applyIcon}>{'\u203A'}</Text>}
                </View>
              </Pressable>
            );
          })
        )}

        {applied.length > 0 ? (
          <>
            <Text style={s.appliedLabel}>APPLIED THIS SESSION</Text>
            {applied.map((a, i) => {
              const skill = list.find((x) => x.id === a.skillId);
              return (
                <View key={a.at + '_' + i} style={[s.appliedRow, a.ok ? s.appliedOk : s.appliedBad]}>
                  <Text style={[s.appliedText, a.ok ? { color: lovable.text } : { color: lovable.error }]}>
                    {a.ok ? '\u2713' : '\u2717'} {skill?.label || a.skillId}
                  </Text>
                  <Text style={s.appliedMeta} numberOfLines={2}>
                    {a.ok ? a.summary : a.error}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: lovable.space.sm + 4, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { color: lovable.text, fontSize: lovable.font.sm + 1, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: lovable.text, fontSize: lovable.font.md, fontWeight: '700' },
  subbar: { paddingHorizontal: lovable.space.lg, paddingTop: lovable.space.sm + 6, paddingBottom: 6 },
  subbarLabel: { color: lovable.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  subbarValue: { color: lovable.text, fontSize: lovable.font.md, fontWeight: '600', marginTop: 2 },
  importRow: {
    flexDirection: 'row', alignItems: 'center', gap: lovable.space.sm,
    paddingHorizontal: lovable.space.md, paddingTop: lovable.space.sm + 4,
  },
  importInput: {
    flex: 1, backgroundColor: lovable.input,
    borderWidth: 1, borderColor: lovable.inputBorder,
    borderRadius: 10, color: lovable.text,
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: 10, fontSize: lovable.font.xs,
    fontFamily: 'monospace',
  },
  importBtn: {
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: 10,
    borderRadius: 10, backgroundColor: lovable.accent,
    minWidth: 70, alignItems: 'center', justifyContent: 'center',
  },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: lovable.font.xs },
  importMsg: { color: lovable.textMuted, fontSize: lovable.font.xs, paddingHorizontal: lovable.space.md, marginTop: 6 },
  statusRow: { paddingHorizontal: lovable.space.lg, paddingTop: lovable.space.sm, paddingBottom: 4 },
  statusText: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace' },
  err: { color: lovable.error, fontSize: lovable.font.xs, paddingHorizontal: lovable.space.lg, marginTop: 6 },
  list: { paddingHorizontal: lovable.space.md, paddingTop: lovable.space.sm },
  empty: { alignItems: 'center', paddingVertical: lovable.space.xxl, paddingHorizontal: lovable.space.lg },
  emptyTitle: { color: lovable.text, fontSize: lovable.font.lg, fontWeight: '600' },
  emptyBody: { color: lovable.textMuted, fontSize: lovable.font.xs, marginTop: lovable.space.sm, textAlign: 'center', lineHeight: 17 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: lovable.space.sm + 2,
    borderRadius: lovable.radius.md, marginBottom: lovable.space.sm,
    backgroundColor: lovable.card,
    borderWidth: 1, borderColor: lovable.cardBorder,
    gap: lovable.space.sm + 4,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: lovable.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconGlyph: { color: lovable.accent, fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTitle: { color: lovable.text, fontSize: lovable.font.md, fontWeight: '600' },
  cardDesc: { color: lovable.textMuted, fontSize: lovable.font.xs, marginTop: 3, lineHeight: 16 },
  cardSource: { color: lovable.textDim, fontSize: 10, fontFamily: 'monospace', marginTop: 4 },
  cardRight: { width: 24, alignItems: 'center' },
  applyIcon: { color: lovable.textMuted, fontSize: 22, marginTop: -2 },
  appliedLabel: {
    color: lovable.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 0.8, marginTop: lovable.space.lg, marginBottom: lovable.space.sm, paddingHorizontal: 4,
  },
  appliedRow: {
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: 10,
    borderRadius: 10, marginBottom: 6, borderWidth: 1,
  },
  appliedOk: { backgroundColor: lovable.successSoft, borderColor: 'rgba(68,221,136,0.20)' },
  appliedBad: { backgroundColor: lovable.errorSoft, borderColor: 'rgba(255,85,85,0.20)' },
  appliedText: { fontSize: lovable.font.sm, fontWeight: '600' },
  appliedMeta: { color: lovable.textMuted, fontSize: lovable.font.xs, marginTop: 3, lineHeight: 15 },
});
