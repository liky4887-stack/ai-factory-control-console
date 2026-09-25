export interface Skill {
  id: string;
  label: string;
  description: string;
  prompt: string;
  icon: string;
}

/**
 * Reusable upgrade prompts. Edit this file to add, remove, or reword
 * skills — nothing else in the app needs to change.
 *
 * Each skill fires a real build against the current project. The
 * backend already knows how to merge the returned files with the
 * existing project tree, so applying a skill is non-destructive.
 */
export const SKILLS: Skill[] = [
  {
    id: 'responsive',
    label: 'Make responsive',
    description: 'Adapts layout for mobile, tablet, and desktop.',
    prompt: 'Make the entire site fully responsive. Use CSS media queries and flexible layouts so it looks right on a phone, a tablet, and a wide desktop. Do not change the visual style, only the responsiveness.',
    icon: '◫',
  },
  {
    id: 'dark-mode',
    label: 'Add dark mode',
    description: 'Light/dark theme toggle with local persistence.',
    prompt: 'Add a dark mode toggle to the site. Implement it with a CSS variables theme system, a small button in the header that toggles the theme, and persistence via localStorage so the choice survives a page reload. Keep the light theme as the default.',
    icon: '◐',
  },
  {
    id: 'seo',
    label: 'SEO boost',
    description: 'Meta tags, Open Graph, and structured data.',
    prompt: 'Improve SEO. Add descriptive title and meta description to every page, Open Graph and Twitter Card meta tags, semantic HTML5 landmarks where possible, and JSON-LD structured data for the main entity. Keep existing visuals untouched.',
    icon: '⌕',
  },
  {
    id: 'contact',
    label: 'Contact form',
    description: 'Inline form with client-side validation.',
    prompt: 'Add a contact section with a form that has name, email, and message fields. Include client-side validation with inline error messages, a submit handler that shows a success state, and no external dependencies. Style it to match the existing site.',
    icon: '✉',
  },
  {
    id: 'favicon',
    label: 'Favicon & PWA',
    description: 'Favicon, apple-touch-icon, and manifest.json.',
    prompt: 'Add a favicon, an apple-touch-icon, and a web app manifest.json. Reference them in the head of every HTML page. Use an inline SVG favicon so no external image file is required.',
    icon: '◈',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Minimal privacy-friendly event tracking.',
    prompt: 'Add a tiny privacy-friendly analytics snippet: record page views and clicks on primary CTAs, store events in localStorage, and log them to console when the query param ?debug=1 is present. No external services.',
    icon: '⌁',
  },
  {
    id: 'animation',
    label: 'Micro-animations',
    description: 'Subtle motion on hover and scroll.',
    prompt: 'Add tasteful micro-animations: fade-up on scroll for major sections, hover lift on cards and buttons, and a subtle pulse on primary CTAs. Use only CSS transitions and IntersectionObserver. Respect prefers-reduced-motion.',
    icon: '✦',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'ARIA, focus states, keyboard navigation.',
    prompt: 'Improve accessibility: add ARIA labels where needed, ensure focus-visible outlines, add keyboard navigation for interactive elements, verify colour contrast meets WCAG AA, and add skip-to-content link. Do not alter the visual design beyond adding focus rings.',
    icon: '◎',
  },
];
