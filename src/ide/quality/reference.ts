// Metadata for the reference projects that inform the gold standard.
// The full source is not bundled — these are name + provenance + the
// distinctive pattern that makes each reference valuable.

export interface ReferenceExample {
  id: string;
  name: string;
  description: string;
  /** The one pattern this reference is the canonical example of. */
  signaturePattern: string;
  /** Library footprint. */
  deps: string[];
  /** Where it lives, so we can point at it if needed. */
  source: string;
}

export const REFERENCES: ReferenceExample[] = [
  {
    id: 'hero-scrub-cinematic',
    name: 'Cinematic Frame-Scrub Hero',
    description:
      'A 300-frame WebP sequence drawn onto a canvas, driven by a GSAP ' +
      'ScrollTrigger timeline over a tall sticky section. Entry choreography, ' +
      'batch frame loading with fetchPriority hints, graceful skip-ahead when ' +
      'a frame is not yet decoded.',
    signaturePattern: 'canvas.drawImage + GSAP timeline.scrub',
    deps: ['gsap', 'gsap/ScrollTrigger'],
    source: 'shadcn/ui component (hero-scrub.tsx)',
  },
  {
    id: 'metro-hero-scroll-lock',
    name: 'Scroll-Locked Video Hero',
    description:
      'Zero-dependency hero. Body is position:fixed so the page cannot ' +
      'move, wheel and touch input are captured to drive video.currentTime ' +
      'forward and backward. RAF lerp smooths the scrub. Custom progress bar ' +
      'and bounce-in scroll hint.',
    signaturePattern: 'body{position:fixed} + wheel capture + video.currentTime',
    deps: [],
    source: 'shadcn/ui component (scroll-locked-video-hero.tsx)',
  },
];

// Cross-cutting patterns both references share independently — these
// become the strongest signals in the standard.
export const SHARED_PATTERNS = [
  'prefers-reduced-motion early-exit path',
  'requestAnimationFrame-driven motion, not CSS keyframes alone',
  'single accent color on a dark base',
  'fluid clamp() display typography with negative tracking',
  'mobile touch handling with passive:false where preventDefault is needed',
  'graceful fallback when assets fail to load',
];

export function referenceById(id: string): ReferenceExample | undefined {
  return REFERENCES.find((r) => r.id === id);
}
