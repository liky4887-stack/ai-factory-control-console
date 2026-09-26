import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FactoryProvider } from './store/FactoryContext';
import { api } from './services/api';
import { LovableNavBar, type NavKey } from './components/LovableNavBar';
import type { PromptAttachment } from './components/AttachmentSheet';
import type { BuildAttachmentsPayload } from './services/api';
import { HomeScreen } from './screens/HomeScreen';
import { ProjectsListScreen } from './screens/ProjectsListScreen';
import { ProjectDetailScreen } from './screens/ProjectDetailScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { SystemPower } from './screens/SystemPower';
import { lovable } from './theme';

type Route =
  | { name: 'home' }
  | { name: 'projects' }
  | { name: 'skills' }
  | { name: 'project'; id: string; title?: string; initialPrompt?: string }
  | { name: 'preview'; id: string; title?: string }
  | { name: 'system' };

function Shell() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [lastProject, setLastProject] = useState<{ id: string; title?: string } | null>(null);
  const top = stack[stack.length - 1];

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => s.length > 1 ? s.slice(0, -1) : s), []);
  const reset = useCallback((r: Route) => setStack([r]), []);

  // Track the most recently opened project so Skills can target it.
  const rememberProject = useCallback((id: string, title?: string) => {
    setLastProject({ id, title });
  }, []);

  const navActive: NavKey =
    top.name === 'home' ? 'home'
    : top.name === 'projects' ? 'projects'
    : top.name === 'skills' ? 'skills'
    : 'home';

  const showNav = top.name === 'home' || top.name === 'projects' || top.name === 'skills';

  const renderTop = () => {
    switch (top.name) {
      case 'home':
        return (
          <HomeScreen
            onCreateProject={async (prompt, _mode, attachments) => {
              const name = prompt.trim().slice(0, 60) || 'Untitled project';
              const slugBase = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 48) || ('p-' + Date.now());
              const slug = slugBase + '-' + Math.random().toString(36).slice(2, 6);
              let created;
              try {
                created = await api.createProject({ name, slug, description: prompt });
              } catch {
                push({ name: 'project', id: 'local_' + Date.now(), title: name, initialPrompt: prompt });
                return;
              }
              const payload: BuildAttachmentsPayload = {};
              const imageUrls: string[] = [];
              const imageDatas: Array<{ name: string; dataUrl: string }> = [];
              const forceSkillIds: string[] = [];
              let figmaUrl: string | undefined;
              for (const r of attachments) {
                if (r.kind === 'image') {
                  if (r.value.startsWith('data:')) {
                    imageDatas.push({ name: r.label || 'photo.jpg', dataUrl: r.value });
                  } else {
                    imageUrls.push(r.value);
                  }
                } else if (r.kind === 'figma') {
                  figmaUrl = r.value;
                } else if (r.kind === 'skill') {
                  forceSkillIds.push(r.value);
                }
              }
              if (imageDatas.length) payload.images = imageDatas;
              if (imageUrls.length) payload.imageUrls = imageUrls;
              if (figmaUrl) payload.figmaUrl = figmaUrl;
              if (forceSkillIds.length) payload.forceSkillIds = forceSkillIds;
              try { await api.buildProject(created.id, prompt, payload); } catch {}
              rememberProject(created.id, created.name);
              push({ name: 'project', id: created.id, title: created.name, initialPrompt: prompt });
            }}
            onOpenSystem={() => push({ name: 'system' })}
            onOpenProjects={() => reset({ name: 'projects' })}
          />
        );

      case 'projects':
        return (
          <ProjectsListScreen
            onOpenProject={(p) => {
              rememberProject(p.id, p.name);
              push({ name: 'project', id: p.id, title: p.name });
            }}
            onCreate={() => { /* TODO: create flow from list */ }}
          />
        );

      case 'skills':
        return (
          <SkillsScreen
            projectId={lastProject?.id ?? null}
            projectTitle={lastProject?.title ?? null}
            onDone={() => {
              // Re-open the last project so the user sees the applied changes.
              if (lastProject) {
                reset({ name: 'project', id: lastProject.id, title: lastProject.title });
              } else {
                reset({ name: 'home' });
              }
            }}
            onClose={() => reset({ name: 'home' })}
          />
        );

      case 'project':
        return (
          <ProjectDetailScreen
            id={top.id}
            title={top.title}
            initialPrompt={top.initialPrompt}
            onClose={pop}
            onOpenPreview={() => push({ name: 'preview', id: top.id, title: top.title })}
          />
        );

      case 'preview':
        return (
          <PreviewScreen
            id={top.id}
            title={top.title}
            onClose={pop}
          />
        );

      case 'system':
        return (
          <View style={s.systemWrap}>
            <SystemPower onClose={pop} />
          </View>
        );
    }
  };

  return (
    <View style={s.root}>
      {renderTop()}
      {showNav ? (
        <LovableNavBar
          active={navActive}
          onChange={(k) => {
            if (k === 'home') reset({ name: 'home' });
            else if (k === 'projects') reset({ name: 'projects' });
            else if (k === 'skills') reset({ name: 'skills' });
          }}
        />
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FactoryProvider>
        <StatusBar style="light" />
        <Shell />
      </FactoryProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  systemWrap: { flex: 1, backgroundColor: lovable.bg },
});
