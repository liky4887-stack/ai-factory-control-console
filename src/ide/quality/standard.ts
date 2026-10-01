// The Website Gold Standard — a 12-dimension rubric derived from two
// high-quality cinematic hero references. Every project the IDE builds
// through the website-build composite is scored against these dimensions.
//
// Each dimension has:
//   - id, label, description
//   - weight (1-10) — higher weight = more important
//   - nonNegotiable — a missing non-negotiable fails the whole check
//   - requiredSignals — regex patterns; at least one must match output
//   - requiredSkillIds — skills that teach this dimension

export interface QualityDimension {
  id: string;
  label: string;
  description: string;
  weight: number;
  nonNegotiable: boolean;
  requiredSignals: RegExp[];
  requiredSkillIds: string[];
}

export const DIMENSIONS: QualityDimension[] = [
  {
    id: 'scroll-narrative',
    label: 'Scroll Narrative',
    description:
      'A scroll-driven story arc — sticky positioning or body-lock captures ' +
      'input to drive content, rather than a plain stacked page.',
    weight: 8,
    nonNegotiable: false,
    requiredSignals: [
      /position\s*:\s*sticky/i,
      /body\.style\.position\s*=\s*["']fixed["']/i,
      /height\s*:\s*\d{3,}\s*[ds]?vh/i,
      /ScrollTrigger/i,
      /scrollTrigger\s*:/i,
    ],
    requiredSkillIds: ['emil-design-eng', 'apple-design', 'animate', 'motion'],
  },
  {
    id: 'hero-scrub',
    label: 'Hero Scrub',
    description:
      'A hero that scrubs — canvas frames or a <video> whose currentTime is ' +
      'driven by scroll input. The visual advances frame-by-frame as the user ' +
      'scrolls, not as a one-shot autoplay.',
    weight: 7,
    nonNegotiable: false,
    requiredSignals: [
      /\.currentTime\s*=/,
      /drawImage\s*\(/,
      /<video[\s>]/i,
      /requestVideoFrameCallback/i,
    ],
    requiredSkillIds: ['motion', 'animate', 'apple-design'],
  },
  {
    id: 'motion-choreography',
    label: 'Motion Choreography',
    description:
      'Motion is interpolated frame-by-frame via requestAnimationFrame or a ' +
      'GSAP timeline, not a bag of CSS @keyframes. The motion has a ' +
      'smooth, eased feel — not linear, not jumpy.',
    weight: 9,
    nonNegotiable: true,
    requiredSignals: [
      /requestAnimationFrame/,
      /gsap\.(timeline|to|from)/i,
      /gsap\.context/i,
      /lerp|damp|interpolat/i,
    ],
    requiredSkillIds: ['motion', 'animate', 'apple-design', 'emil-design-eng'],
  },
  {
    id: 'reduced-motion',
    label: 'Reduced Motion',
    description:
      'Respects prefers-reduced-motion: reduce. An alternative static or ' +
      'cross-fade path exists for users who request it.',
    weight: 10,
    nonNegotiable: true,
    requiredSignals: [
      /prefers-reduced-motion/i,
      /reduce\s*:\s*(reduce|no-preference)/i,
      /reducedMotion|reduceMotion/i,
    ],
    requiredSkillIds: ['ui-ux-pro-max', 'apple-design', 'mobile-native'],
  },
  {
    id: 'typography-system',
    label: 'Typography System',
    description:
      'Fluid type via clamp(), consistent letter-spacing (negative on large ' +
      'display text), and a defined font stack — not an ad-hoc mix of sizes.',
    weight: 8,
    nonNegotiable: false,
    requiredSignals: [
      /clamp\(\s*[0-9]/,
      /letter-spacing/i,
      /font-family|fontFamily/,
      /font-optical-sizing/i,
    ],
    requiredSkillIds: ['design-taste-frontend', 'ui-ux-pro-max'],
  },
  {
    id: 'color-system',
    label: 'Color System',
    description:
      'Colors are declared once as semantic CSS custom properties (:root ' +
      '--color-*), not as repeated raw hex values. Single accent color with a ' +
      'dark base.',
    weight: 7,
    nonNegotiable: false,
    requiredSignals: [
      /:root\s*{/,
      /--[a-z][a-z0-9-]*\s*:\s*(#|rgb|hsl|color)/i,
      /var\(--/i,
    ],
    requiredSkillIds: ['design-system', 'ui-ux-pro-max'],
  },
  {
    id: 'atmospheric-depth',
    label: 'Atmospheric Depth',
    description:
      'Multiple layers of gradient, vignette, or inset shadow create ' +
      'atmosphere — the surface reads as deep, not flat.',
    weight: 6,
    nonNegotiable: false,
    requiredSignals: [
      /radial-gradient/i,
      /linear-gradient/i,
      /box-shadow[^;]*inset/i,
      /backdrop-filter/i,
    ],
    requiredSkillIds: ['design-taste-frontend', 'emil-design-eng', 'apple-design'],
  },
  {
    id: 'layout-math',
    label: 'Layout Math',
    description:
      'Uses modern CSS: svh/dvh units for viewport safety, aspect-ratio for ' +
      'media, min()/max()/clamp() for responsive sizing. No fixed pixel widths ' +
      'that break on small screens.',
    weight: 7,
    nonNegotiable: false,
    requiredSignals: [
      /[sd]vh/i,
      /aspect-ratio/i,
      /min\(|max\(/,
      /dvh|dvw/i,
    ],
    requiredSkillIds: ['ui-ux-pro-max', 'mobile-native'],
  },
  {
    id: 'performance-discipline',
    label: 'Performance Discipline',
    description:
      'Animations use transform/opacity only. will-change hints present. No ' +
      'layout-thrashing reads inside animation loops (offsetWidth, getBoundingClientRect).',
    weight: 8,
    nonNegotiable: false,
    requiredSignals: [
      /will-change/i,
      /transform\s*:\s*(translate|scale|rotate)/i,
      /translate3d|translateZ/,
    ],
    requiredSkillIds: ['apple-design', 'mobile-native'],
  },
  {
    id: 'graceful-degradation',
    label: 'Graceful Degradation',
    description:
      'Network failures and missing assets degrade cleanly — images handle ' +
      'onerror, promises are caught, and a fallback path exists for frames ' +
      'that fail to load.',
    weight: 7,
    nonNegotiable: false,
    requiredSignals: [
      /onerror\s*=/i,
      /\.catch\s*\(/,
      /fallback|fallbackPath/i,
      /framesOk|isLoaded|img\.complete/i,
    ],
    requiredSkillIds: ['emil-design-eng'],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description:
      'Decorative layers have aria-hidden. Sections have aria-label. Headings ' +
      'are semantic (h1/h2/h3). No emoji-as-icons.',
    weight: 9,
    nonNegotiable: true,
    requiredSignals: [
      /aria-hidden/i,
      /aria-label/i,
      /role\s*=\s*["']/i,
      /<h[1-6][\s>]/,
    ],
    requiredSkillIds: ['ui-ux-pro-max', 'mobile-native'],
  },
  {
    id: 'mobile-discipline',
    label: 'Mobile Discipline',
    description:
      'Touch events handled with passive:false where preventDefault is needed. ' +
      'touch-action declared on the scrubbing surface. overscroll-behavior ' +
      'prevents accidental page jumps.',
    weight: 9,
    nonNegotiable: false,
    requiredSignals: [
      /touchstart|touchmove|touchend/i,
      /touch-action/i,
      /overscroll/i,
      /passive\s*:\s*(false|true)/i,
    ],
    requiredSkillIds: ['mobile-native', 'apple-design', 'ui-ux-pro-max'],
  },
];

export interface QualityStandard {
  id: string;
  label: string;
  description: string;
  threshold: number;
  dimensions: QualityDimension[];
  referenceIds: string[];
}

export const WEBSITE_STANDARD: QualityStandard = {
  id: 'website-gold',
  label: 'Website Gold Standard',
  description:
    'Minimum quality bar for any website or landing page built through the IDE. ' +
    'Derived from two cinematic scroll-scrubbed hero references.',
  threshold: 75,
  dimensions: DIMENSIONS,
  referenceIds: ['hero-scrub-cinematic', 'metro-hero-scroll-lock'],
};
