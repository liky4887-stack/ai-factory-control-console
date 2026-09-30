// Detects whether a prompt touches UI/UX, video/media, both, or neither.
// Skills only load when at least one of these is true, so backend/script
// requests stay completely free of skill injection overhead.

// ─── UI/UX words ──────────────────────────────────────────────
const UI_UX_WORDS = new RegExp(
  [
    'ui', 'ux', 'design', 'interface', 'layout', 'screen', 'page', 'view',
    'component', 'widget', 'panel', 'modal', 'dialog', 'sheet', 'drawer',
    'color', 'colour', 'palette', 'theme', 'dark mode', 'light mode',
    'typography', 'font', 'text', 'spacing', 'padding', 'margin',
    'radius', 'shadow', 'border', 'gradient', 'icon', 'image', 'logo',
    'animation', 'transition', 'motion', 'hover', 'focus', 'tap', 'click',
    'keyboard', 'accessibility', 'aria', 'contrast', 'responsive',
    'breakpoint', 'mobile-first', 'touch', 'gesture',
    'button', 'input', 'form', 'nav', 'navigation', 'menu', 'tab',
    'card', 'list', 'grid', 'table', 'chart', 'graph', 'badge', 'chip',
    'tooltip', 'dropdown', 'toast', 'notification', 'banner', 'hero',
    'style', 'styled', 'styling', 'restyle', 'redesign', 'polish',
    'visual', 'aesthetic', 'beautiful', 'pretty', 'clean', 'minimal',
    'fancy', 'modern', 'elegant', 'premium', 'glass', 'glassmorphism',
    'brand', 'identity', 'guideline', 'style guide', 'design system',
    'design token', 'token',
  ].join('|'),
  'i'
);

const UI_UX_FILES = /\.(tsx|jsx|css|scss|sass|less|html|vue|svelte|astro|swift|dart)$/i;
const UI_UX_PATH_HINTS = /(components?|screens?|views?|pages?|styles?|theme|ui\/|ux\/|design|layouts?|widgets?|tailwind)/i;

// ─── Video / media words ──────────────────────────────────────
// Kept separate so a "fix the button hover" prompt never pulls a
// video skill, and a "10-second product intro" never pulls a UI skill.
const VIDEO_WORDS = new RegExp(
  [
    // core
    'video', 'mp4', 'movie', 'clip', 'film', 'reel', 'short',
    'render', 'rendering', 'composition', 'timeline',
    // formats & frameworks
    'hyperframe', 'hyperframes', 'remotion', 'gsap',
    'captions', 'subtitles', 'subtitle',
    // purposes
    'promo', 'promotional', 'explainer', 'intro', 'outro',
    'teaser', 'trailer', 'recut', 'recap',
    'product launch', 'launch video', 'pr video',
    // audio & voice
    'voiceover', 'voice-over', 'voice over', 'narration',
    'music video', 'music-to-video', 'soundtrack', 'score',
    // video-specific craft
    'b-roll', 'broll', 'storyboard', 'keyframe timeline',
    'slideshow', 'motion graphic', 'motion graphics',
    'talking head', 'faceless',
    'camera orbit', 'camera move', 'scene', 'shot',
    'wide shot', 'close-up', 'close up',
  ].join('|'),
  'i'
);

const VIDEO_EXTS = /\.(mp4|webm|mov|mkv|gif|mp3|wav|m4a)$/i;
const VIDEO_PATH_HINTS = /(hyperframes?\/|videos?\/|compositions?\/|scenes?\/|clips?\/|storyboards?\/)/i;

export interface UiUxIntentResult {
  /** Does the prompt touch interface / design / UI animation? */
  isUiUx: boolean;
  /** Does the prompt touch video / motion graphics / rendering? */
  isVideo: boolean;
  /** Human-readable signals that fired. Useful for the Glass Box. */
  reasons: string[];
  /** Words from the prompt that matched. */
  matchedWords: string[];
  /** Which domain the request leans toward. */
  preferredDomain: 'ui-ux' | 'media' | 'either';
}

export function detectUiUxIntent(prompt: string): UiUxIntentResult {
  const reasons: string[] = [];
  const matched = new Set<string>();
  const lower = prompt.toLowerCase();

  // UI/UX signals
  const uiWordMatches = lower.match(new RegExp(UI_UX_WORDS.source, 'gi')) || [];
  for (const w of uiWordMatches) matched.add(w.toLowerCase());
  if (uiWordMatches.length > 0) reasons.push('ui-word:' + uiWordMatches.length);

  const uiExtHit = UI_UX_FILES.test(prompt);
  const uiPathHit = UI_UX_PATH_HINTS.test(prompt);
  if (uiExtHit) reasons.push('ui-file-extension');
  if (uiPathHit) reasons.push('ui-path-hint');

  // Video / media signals
  const videoWordMatches = lower.match(new RegExp(VIDEO_WORDS.source, 'gi')) || [];
  for (const w of videoWordMatches) matched.add(w.toLowerCase());
  if (videoWordMatches.length > 0) reasons.push('video-word:' + videoWordMatches.length);

  const videoExtHit = VIDEO_EXTS.test(prompt);
  const videoPathHit = VIDEO_PATH_HINTS.test(prompt);
  if (videoExtHit) reasons.push('video-file-extension');
  if (videoPathHit) reasons.push('video-path-hint');

  const isUiUx = uiWordMatches.length > 0 || uiExtHit || uiPathHit;
  const isVideo = videoWordMatches.length > 0 || videoExtHit || videoPathHit;

  // Preferred domain: whichever signal is stronger. Ties go to 'either'
  // so the matcher picks the best-scoring skills from both domains.
  let preferredDomain: 'ui-ux' | 'media' | 'either' = 'either';
  if (isVideo && !isUiUx) preferredDomain = 'media';
  else if (isUiUx && !isVideo) preferredDomain = 'ui-ux';
  else if (isVideo && isUiUx) {
    preferredDomain = videoWordMatches.length > uiWordMatches.length ? 'media' : 'ui-ux';
  }

  return {
    isUiUx,
    isVideo,
    reasons,
    matchedWords: Array.from(matched).slice(0, 12),
    preferredDomain,
  };
}
