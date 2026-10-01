// Composites are named groups of skills loaded together when the request
// matches a broad workflow (e.g. "build me a website"). Instead of the
// matcher picking the top 3 by tag overlap, a composite loads every skill
// in its list, subject to the same body caps.

export interface Composite {
  id: string;
  label: string;
  description: string;
  skillIds: string[];
  totalCap: number;
  perSkillCap: number;
}

export const WEBSITE_BUILD: Composite = {
  id: 'website-build',
  label: 'Website Build',
  description:
    'Full-stack website design and build — combines UI/UX rules, taste, craft, motion, tokens, and mobile craft.',
  skillIds: [
    // Highest-leverage first so truncation never drops them.
    'ui-ux-pro-max',
    'design-taste-frontend',
    'emil-design-eng',
    'apple-design',
    'motion',
    'mobile-native',
    'design-system',
    'animate',
    'minimalist-ui',
    'ui-styling',
    'design',
  ],
  totalCap: 140_000,
  perSkillCap: 15_000,
};

export const COMPOSITES: Composite[] = [WEBSITE_BUILD];

export function compositeById(id: string): Composite | undefined {
  return COMPOSITES.find((c) => c.id === id);
}
