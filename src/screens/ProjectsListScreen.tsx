import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { lovable } from '../theme';
import type { Project } from '../types';

interface Props {
  onOpenProject: (p: { id: string; name: string }) => void;
  onCreate: () => void;
}

function gradientFor(id: string): [string, string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  const hue = h % 360;
  return [
    'hsl(' + hue + ', 60%, 18%)',
    'hsl(' + ((hue + 40) % 360) + ', 70%, 32%)',
    'hsl(' + ((hue + 80) % 360) + ', 80%, 48%)',
  ];
}

function relativeDate(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const d = Math.floor(diff / 86400000);
    if (d <= 0) return 'today';
    if (d === 1) return '1 day ago';
    if (d < 30) return d + ' days ago';
    return new Date(iso).toLocaleDateString();
  } catch { return ''; }
}

export function ProjectsListScreen({ onOpenProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProjects();
      setProjects(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.h1}>Projects</Text>
        <View style={s.headerIcons}>
          <Pressable style={s.iconBtn} accessibilityLabel="Search"><Text style={s.iconText}>{'\u2315'}</Text></Pressable>
          <Pressable style={s.iconBtn} accessibilityLabel="Sort"><Text style={s.iconText}>{'\u2261'}</Text></Pressable>
        </View>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search projects..."
          placeholderTextColor={lovable.textDim}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error ? <Text style={s.err}>{'\u2022'} {error}</Text> : null}
      {loading ? <ActivityIndicator color={lovable.accent} style={{ marginTop: lovable.space.lg }} /> : null}

      <ScrollView contentContainerStyle={s.list}>
        {filtered.map((p) => {
          const colors = gradientFor(p.id);
          return (
            <Pressable
              key={p.id}
              onPress={() => onOpenProject({ id: p.id, name: p.name })}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={colors}
                style={s.thumb}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={s.thumbLetter}>{p.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>

              <View style={s.rowText}>
                <Text style={s.rowTitle} numberOfLines={1}>{p.name}</Text>
                <Text style={s.rowMeta} numberOfLines={1}>
                  Q077 {'\u00B7'} {relativeDate(p.updatedAt ?? p.createdAt ?? new Date().toISOString())}
                </Text>
              </View>

              <Pressable style={s.moreBtn} accessibilityLabel="More options">
                <Text style={s.moreText}>{'\u2022\u2022\u2022'}</Text>
              </Pressable>
            </Pressable>
          );
        })}

        {filtered.length === 0 && !loading ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>{'\u229E'}</Text>
            <Text style={s.emptyTitle}>No projects yet</Text>
            <Text style={s.emptyBody}>Create your first project from the Home screen.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: lovable.space.lg, paddingTop: lovable.space.sm + 4, paddingBottom: lovable.space.sm,
  },
  h1: { color: lovable.text, fontSize: lovable.font.xxxl, fontWeight: '700', letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { color: lovable.text, fontSize: lovable.font.lg },
  searchWrap: { paddingHorizontal: lovable.space.lg, paddingBottom: lovable.space.sm + 4 },
  searchInput: {
    backgroundColor: lovable.input,
    borderWidth: 1, borderColor: lovable.inputBorder,
    borderRadius: lovable.radius.md, color: lovable.text,
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: 10, fontSize: lovable.font.md,
  },
  err: { color: lovable.error, fontSize: lovable.font.xs, paddingHorizontal: lovable.space.lg, marginBottom: lovable.space.sm },
  list: { paddingHorizontal: lovable.space.lg, paddingBottom: 140 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: lovable.space.sm + 4, gap: lovable.space.sm + 6 },
  thumb: {
    width: 64, height: 64, borderRadius: lovable.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbLetter: { color: '#fff', fontSize: lovable.font.xl, fontWeight: '800', opacity: 0.9 },
  rowText: { flex: 1 },
  rowTitle: { color: lovable.text, fontSize: lovable.font.lg, fontWeight: '600' },
  rowMeta: { color: lovable.textMuted, fontSize: lovable.font.sm, marginTop: 4 },
  moreBtn: { paddingHorizontal: lovable.space.sm, paddingVertical: 4 },
  moreText: { color: lovable.textDim, fontSize: lovable.font.xs, letterSpacing: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: lovable.space.xxl, paddingHorizontal: lovable.space.lg },
  emptyIcon: { color: lovable.textDim, fontSize: 48, marginBottom: lovable.space.md },
  emptyTitle: { color: lovable.text, fontSize: lovable.font.xl, fontWeight: '600', marginBottom: lovable.space.sm },
  emptyBody: { color: lovable.textMuted, fontSize: lovable.font.sm, textAlign: 'center', lineHeight: 20 },
});
