// Decides whether a prompt touches UI/UX. Skills only load when this
// returns true, so non-visual work (backend, scripts, data) stays
// completely free of skill injection overhead.

// Two independent signals:
//   1. UI/UX domain words in the prompt
//   2. UI/UX file references (component, style, screen files)
const UI_UX_WORDS = new RegExp(
  [
    // design surfaces
    'ui', 'ux', 'design', 'interface', 'layout', 'screen', 'page', 'view',
    'component', 'widget', 'panel', 'modal', 'dialog', 'sheet', 'drawer',
    // visual properties
    'color', 'colour', 'palette', 'theme', 'dark mode', 'light mode',
    'typography', 'font', 'text', 'spacing', 'padding', 'margin',
    'radius', 'shadow', 'border', 'gradient', 'icon', 'image', 'logo',
    // interaction
    'animation', 'transition', 'motion', 'hover', 'focus', 'tap', 'click',
    'keyboard', 'accessibility', 'aria', 'contrast', 'responsive',
    'breakpoint', 'mobile-first', 'touch', 'gesture',
    // concrete
    'button', 'input', 'form', 'nav', 'navigation', 'menu', 'tab',
    'card', 'list', 'grid', 'table', 'chart', 'graph', 'badge', 'chip',
    'tooltip', 'dropdown', 'toast', 'notification', 'banner', 'hero',
    // actions
    'style', 'styled', 'styling', 'restyle', 'redesign', 'polish',
    'visual', 'aesthetic', 'beautiful', 'pretty', 'clean', 'minimal',
    'fancy', 'modern', 'elegant', 'premium', 'glass', 'glassmorphism',
    // brand
    'brand', 'identity', 'guideline', 'style guide', 'design system',
    'design token', 'token',
  ].join('|'),
  'i'
);

const UI_UX_FILES = /\.(tsx|jsx|css|scss|sass|less|html|vue|svelte|astro|swift|dart)$/i;

// Specific filename patterns that imply UI
const UI_UX_PATH_HINTS = /(components?|screens?|views?|pages?|styles?|theme|ui\/|ux\/|design|layouts?|widgets?|app\.json|tailwind)/i;

export interface UiUxIntentResult {
  isUiUx: boolean;
  /** Which signal triggered — useful for the Glass Box. */
  reasons: string[];
  /** Words from the prompt that matched. */
  matchedWords: string[];
}

export function detectUiUxIntent(prompt: string): UiUxIntentResult {
  const reasons: string[] = [];
  const matched = new Set<string>();

  // Word match — scan every token
  const lower = prompt.toLowerCase();
  const wordMatches = lower.match(new RegExp(UI_UX_WORDS.source, 'gi')) || [];
  for (const w of wordMatches) matched.add(w.toLowerCase());

  if (wordMatches.length > 0) reasons.push('word:' + wordMatches.length);

  // File extension match
  if (UI_UX_FILES.test(prompt)) reasons.push('ui-file-extension');

  // Path hint
  if (UI_UX_PATH_HINTS.test(prompt)) reasons.push('ui-path-hint');

  // Any single strong signal is enough. We do NOT require multiple.
  const isUiUx = reasons.length > 0;

  return {
    isUiUx,
    reasons,
    matchedWords: Array.from(matched).slice(0, 12),
  };
}
