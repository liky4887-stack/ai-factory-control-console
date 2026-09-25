import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { listFiles, readFile, type FileEntry } from '../services/deepseekApi';
import { theme } from '../theme';

const HOME = '/data/data/com.termux/files/home';
const ROOTS = [
  { label: 'data',      path: `${HOME}/sovereign-core-data` },
  { label: 'workspace', path: `${HOME}/bridge-workspace` },
];

interface Preview {
  path: string;
  content: string;
  size: number;
}

export function FileTreePanel() {
  const [cwd, setCwd] = useState(ROOTS[0].path);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFiles(path);
      setEntries(r.entries);
      setCwd(r.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(cwd); /* eslint-disable-next-line */ }, []);

  const goUp = () => {
    const parent = cwd.replace(/\/[^/]+$/, '');
    if (parent && parent !== cwd && parent.startsWith(HOME)) {
      setPreview(null);
      void load(parent);
    }
  };

  const onEntry = async (e: FileEntry) => {
    if (e.type === 'dir') {
      setPreview(null);
      void load(e.path);
    } else if (e.type === 'file') {
      try {
        const r = await readFile(e.path);
        setPreview({ path: r.path, content: r.content, size: r.size });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const short = cwd.replace(HOME + '/', '~/');
  const dirs = entries.filter((e) => e.type === 'dir');
  const files = entries.filter((e) => e.type !== 'dir');

  return (
    <View style={s.root}>
      <View style={s.row}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rootsRow}>
          {ROOTS.map((r) => (
            <Pressable
              key={r.label}
              onPress={() => { setPreview(null); void load(r.path); }}
              style={[s.rootPill, cwd === r.path && s.rootPillActive]}
            >
              <Text style={[s.rootPillText, cwd === r.path && { color: theme.cyan }]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={goUp} style={s.iconBtn}>
          <Text style={s.iconText}>↑</Text>
        </Pressable>
        <Pressable onPress={() => void load(cwd)} style={s.iconBtn}>
          <Text style={s.iconText}>⟳</Text>
        </Pressable>
      </View>

      <Text style={s.path} numberOfLines={1}>{short}</Text>

      {error && <Text style={s.err}>● {error}</Text>}
      {loading && <ActivityIndicator color={theme.cyan} style={{ marginVertical: 8 }} />}

      <ScrollView style={s.list} nestedScrollEnabled>
        {dirs.map((e) => (
          <Pressable key={e.path} onPress={() => onEntry(e)} style={({ pressed }) => [s.entryRow, pressed && { opacity: 0.7 }]}>
            <Text style={s.dirIcon}>▸</Text>
            <Text style={s.dirName} numberOfLines={1}>{e.name}</Text>
          </Pressable>
        ))}
        {files.map((e) => (
          <Pressable key={e.path} onPress={() => onEntry(e)} style={({ pressed }) => [s.entryRow, pressed && { opacity: 0.7 }]}>
            <Text style={[s.fileIcon, preview?.path === e.path && { color: theme.cyan }]}>▫</Text>
            <Text
              style={[s.fileName, preview?.path === e.path && { color: theme.cyan }]}
              numberOfLines={1}
            >{e.name}</Text>
            <Text style={s.fileMeta}>{e.size}B</Text>
          </Pressable>
        ))}
        {entries.length === 0 && !loading && (
          <Text style={s.empty}>(empty directory)</Text>
        )}
      </ScrollView>

      {preview && (
        <View style={s.previewWrap}>
          <View style={s.previewHead}>
            <Text style={s.previewTitle} numberOfLines={1}>{preview.path.replace(HOME + '/', '~/')}</Text>
            <Text style={s.previewSize}>{preview.size}B</Text>
            <Pressable onPress={() => setPreview(null)} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={s.previewScroll} nestedScrollEnabled>
            <Text style={s.previewMono}>{preview.content}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  rootsRow: { flex: 1, maxHeight: 32 },
  rootPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, marginRight: 6 },
  rootPillActive: { borderColor: theme.cyan },
  rootPillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' },
  path: { color: theme.textMuted, fontFamily: 'monospace', fontSize: 10, marginBottom: 6 },
  err: { color: theme.red, fontSize: 11, fontFamily: 'monospace', marginBottom: 6 },
  list: { maxHeight: 220, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 8, borderWidth: 1, borderColor: theme.border, padding: 6 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6 },
  dirIcon: { color: theme.cyan, fontSize: 12, width: 16 },
  dirName: { color: theme.text, fontSize: 12, fontFamily: 'monospace', flex: 1 },
  fileIcon: { color: theme.textMuted, fontSize: 12, width: 16 },
  fileName: { color: theme.textSecondary, fontSize: 12, fontFamily: 'monospace', flex: 1 },
  fileMeta: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace' },
  empty: { color: theme.textMuted, fontSize: 11, fontStyle: 'italic', padding: 8, textAlign: 'center' },
  previewWrap: { marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.cyan + '40', backgroundColor: 'rgba(8, 11, 17, 0.7)', overflow: 'hidden' },
  previewHead: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  previewTitle: { color: theme.cyan, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  previewSize: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace' },
  closeBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.glassSoft, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: theme.textMuted, fontSize: 11 },
  previewScroll: { maxHeight: 200 },
  previewMono: { color: theme.textSecondary, fontSize: 11, fontFamily: 'monospace', lineHeight: 16, padding: 10 },
});
