// Deep-black glassmorphism panel. Uses theme (dark) tokens only.
import React from 'react';
import { View, Text, StyleSheet, type ViewProps } from 'react-native';
import { theme } from '../../theme';

interface Props extends ViewProps {
  title?: string;
  subtitle?: string;
  /** Optional tint — one of theme.cyan, theme.blue, etc. Adds a soft glow line. */
  accent?: string;
  padded?: boolean;
}

export function GlassPanel({ title, subtitle, accent, padded, style, children, ...rest }: Props) {
  return (
    <View style={[s.panel, padded !== false && s.padded, style]} {...rest}>
      {accent ? <View style={[s.accentBar, { backgroundColor: accent }]} /> : null}
      {title || subtitle ? (
        <View style={s.header}>
          {title ? <Text style={s.title}>{title}</Text> : null}
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    overflow: 'hidden',
  },
  padded: { padding: 14 },
  accentBar: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 2,
  },
  header: { marginBottom: 10 },
  title: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: theme.mono,
  },
});
