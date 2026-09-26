// Figma reference: light cream palette, serif display, pastel mesh.
// This file powers all `lovable.*` tokens used by live screens.
// `theme` and `statusColors` below are legacy dark tokens — used only
// by orphan screens that are not wired into App.tsx. Do not delete.

export const theme = {
  bg: '#06080D',
  bgRaised: '#0F131B',
  glass: 'rgba(18, 24, 36, 0.82)',
  glassStrong: '#141C2A',
  glassSoft: 'rgba(26, 36, 52, 0.68)',
  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(96, 165, 250, 0.40)',
  text: '#F4F7FB',
  textSecondary: '#A7B3C5',
  textMuted: '#6E7C91',
  cyan: '#46D7FF',
  blue: '#4F8CFF',
  magenta: '#D86BFF',
  green: '#4DE39A',
  amber: '#F7B955',
  red: '#FF6B7A',
  purple: '#B98AFF',
  gold: '#E8C36F',
  teal: '#3DD6C0',
  void: '#0A0612',
  mono: 'monospace',
  radius: 14,
  radiusLg: 20,
  spacing: 8,
} as const;

export const statusColors: Record<string, string> = {
  success: theme.green,
  verified: theme.green,
  completed: theme.green,
  running: theme.cyan,
  idle: theme.textMuted,
  pending: theme.amber,
  warning: theme.amber,
  flagged: theme.red,
  error: theme.red,
  failed: theme.red,
  paused: theme.purple,
  draft: theme.textMuted,
  active: theme.cyan,
  archived: theme.purple,
  experimental: theme.magenta,
  omega: theme.red,
  safe: theme.green,
  controlled: theme.amber,
};

// ─────────────────────────────────────────────────────────────
// LIVE TOKENS — light editorial palette.
// Every key below was in the previous dark version; only values
// changed, plus a few new keys (mesh, pill*, chip*, fontSerif,
// font.display, font.hero). No key was removed.
// ─────────────────────────────────────────────────────────────
export const lovable = {
  // Surfaces — warm cream
  bg: '#F5F3EE',
  bgElevated: '#FAF8F4',
  card: '#FFFFFF',
  cardHover: '#FAFAFA',
  cardBorder: 'rgba(10, 10, 10, 0.06)',
  cardBorderHover: 'rgba(10, 10, 10, 0.14)',

  // Inputs — white box on cream
  input: '#FFFFFF',
  inputBorder: 'rgba(10, 10, 10, 0.08)',
  inputFocus: 'rgba(10, 10, 10, 0.18)',

  // Text — near black on light
  text: '#0A0A0A',
  textMuted: '#6B6B6B',
  textDim: '#9A9A9A',
  textFaint: '#C8C8C8',

  // Primary — black, matches the reference buttons
  accent: '#0A0A0A',
  accentHover: '#262626',
  accentSoft: 'rgba(10, 10, 10, 0.05)',
  accentBorder: 'rgba(10, 10, 10, 0.12)',

  // Semantic
  success: '#16A34A',
  successSoft: 'rgba(22, 163, 74, 0.10)',
  error: '#DC2626',
  errorSoft: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.10)',

  // Nav — white floating pill on cream
  navBg: 'rgba(255, 255, 255, 0.94)',
  navBorder: 'rgba(10, 10, 10, 0.06)',
  navActiveBg: 'rgba(10, 10, 10, 0.06)',
  navActiveText: '#0A0A0A',

  // Secondary pill — the "🌐 Online" chip in the reference
  pillBg: 'rgba(10, 10, 10, 0.04)',
  pillBorder: 'rgba(10, 10, 10, 0.08)',
  pillText: '#0A0A0A',

  // Attachment chip above the input
  chipBg: 'rgba(10, 10, 10, 0.06)',
  chipText: '#0A0A0A',
  chipBorder: 'rgba(10, 10, 10, 0.08)',

  // Mesh gradient — soft pastel blob behind the hero.
  // Green → yellow → peach → rose → fades to bg.
  mesh: [
    '#E4EFD8',
    '#F3EBC8',
    '#F4D4B0',
    '#EFC7CC',
    '#F5F3EE',
  ] as const,

  // Legacy linear-gradient stops, repurposed for light theme.
  // (Cream → peach gradient — used as fallback in GradientBackground.)
  gradient: [
    '#F5F3EE',
    '#F5EFE4',
    '#F3E9DB',
    '#F2E2D2',
    '#F2DBCB',
    '#F2D4C6',
    '#F3D0C4',
    '#F5D0C4',
  ] as const,

  // Typography — serif for display headlines only
  fontSerif: 'serif' as const,

  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const,
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const,
  font: {
    xs: 11,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 26,
    xxxl: 32,
    display: 40,
    hero: 44,
  } as const,
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  } as const,

  // Shadows — lighter theme, softer
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 24,
      elevation: 8,
    },
  } as const,
} as const;
