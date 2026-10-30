/**
 * Upcoming stories and events, curated by hand.
 *
 * Calliope's public projection only ever exposes *published* articles,
 * so there is no upstream source for "coming up" content. This list is
 * the single place to maintain it. When it is empty the homepage
 * renders a friendly "nothing scheduled" message instead.
 */
export interface ComingUpItem {
  title: string;
  description?: string;
  /** Display date, e.g. "Coming Friday" or "12 Dec 2025". */
  date?: string;
  /** Optional link to a related published article. */
  href?: string;
}

export const comingUpItems: ComingUpItem[] = [
  // Example entry:
  // {
  //   title: 'A field guide to the new archive API',
  //   description: 'Walking through the Calliope write path end to end.',
  //   date: 'Coming Friday',
  //   href: '/articles/introducing-the-archive',
  // },
];
