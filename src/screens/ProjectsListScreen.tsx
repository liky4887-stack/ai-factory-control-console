// Figma reference: projects list in light theme.
// White cards on cream, pastel thumbnails, Feather icons.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { api } from '../services/api';
import { lovable } from '../theme';
import type { Project } from '../types';

interface Props {
  onOpenProject: (p: { id: string; name: string }) => void;
  onCreate: () => void;
}

// Pastel hues matching the mesh palette — light enough for the theme.
function gradientFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  const hue = h % 360;
  return [
    'hsl(' + hue + ', 55%, 88%)',
    'hsl(' + ((hue + 40) % 360) + ', 60%, 76%)',
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
          <Pressable style={s.iconBtn} accessibilityLabel="Search">
            <Feather name="search" size={17} color={lovable.text} />
          </Pressable>
          <Pressable style={s.iconBtn} accessibilityLabel="Sort">
            <Feather name="menu" size={17} color={lovable.text} />
          </Pressable>
        </View>
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchInner}>
          <Feather name="search" size={15} color={lovable.textDim} />
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
                  {relativeDate(p.updatedAt ?? p.createdAt ?? new Date().toISOString())}
                </Text>
              </View>

              <Pressable style={s.moreBtn} accessibilityLabel="More options">
                <Feather name="more-horizontal" size={18} color={lovable.textDim} />
              </Pressable>
            </Pressable>
          );
        })}

        {filtered.length === 0 && !loading ? (
          <View style={s.emptyBox}>
            <Feather name="grid" size={42} color={lovable.textDim} />
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
    paddingHorizontal: lovable.space.lg,
    paddingTop: lovable.space.sm + 4,
    paddingBottom: lovable.space.sm,
  },
  h1: {
    color: lovable.text,
    fontSize: lovable.font.xxxl,
    fontWeight: lovable.weight.bold,
    letterSpacing: -0.5,
  },
  headerIcons: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: lovable.space.lg, paddingBottom: lovable.space.sm + 4 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: lovable.input,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    borderRadius: lovable.radius.md,
    paddingHorizontal: lovable.space.sm + 2,
  },
  searchInput: {
    flex: 1,
    color: lovable.text,
    paddingVertical: 10,
    fontSize: lovable.font.md,
  },
  err: {
    color: lovable.error,
    fontSize: lovable.font.xs,
    paddingHorizontal: lovable.space.lg,
    marginBottom: lovable.space.sm,
  },
  list: { paddingHorizontal: lovable.space.lg, paddingBottom: 140 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm + 6,
    paddingVertical: lovable.space.sm + 4,
    paddingHorizontal: lovable.space.sm + 4,
    marginBottom: lovable.space.sm,
    backgroundColor: lovable.card,
    borderRadius: lovable.radius.lg,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  thumb: {
    width: 56, height: 56, borderRadius: lovable.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbLetter: {
    color: 'rgba(10,10,10,0.75)',
    fontSize: lovable.font.xl,
    fontWeight: lovable.weight.bold,
  },
  rowText: { flex: 1 },
  rowTitle: {
    color: lovable.text,
    fontSize: lovable.font.lg,
    fontWeight: lovable.weight.semibold,
  },
  rowMeta: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    marginTop: 4,
  },
  moreBtn: { paddingHorizontal: lovable.space.sm, paddingVertical: 4 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: lovable.space.xxl,
    paddingHorizontal: lovable.space.lg,
    gap: lovable.space.sm,
  },
  emptyTitle: {
    color: lovable.text,
    fontSize: lovable.font.xl,
    fontWeight: lovable.weight.semibold,
    marginTop: lovable.space.sm,
  },
  emptyBody: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
