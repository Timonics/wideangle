/**
 * Frontend content contracts.
 *
 * These are WideAngle's models, NOT Calliope's schema. The adapter
 * (`src/lib/calliope/adapter.ts`) is the only place that knows how a
 * Calliope response maps onto these shapes — page components depend on
 * these types exclusively.
 */

/** A taxonomy term (category or tag). */
export interface TaxonomyView {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorView {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
}

export interface HeroImageView {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/**
 * A single content block. `type` is an open string by design (the
 * upstream content format is editor-agnostic); the renderer recognises
 * a known vocabulary and safely degrades on anything else.
 */
export interface ContentBlock {
  type: string;
  data: Record<string, unknown>;
}

export interface ArticleView {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  /** Validated content blocks. */
  body: ContentBlock[];
  /** ISO-8601 publish timestamp. Always present for public articles. */
  publishedAt: string;
  /**
   * ISO-8601 modification timestamp.
   *
   * The current Calliope public projection does not expose
   * `updatedAt`, so this is usually absent. It is carried through
   * regardless so the frontend does not need a change when the
   * upstream starts publishing it.
   */
  modifiedAt?: string;
  author: AuthorView;
  categories: TaxonomyView[];
  tags: TaxonomyView[];
  heroImage?: HeroImageView;
  seo?: {
    title?: string;
    description?: string;
    socialImageUrl?: string;
  };
  /** Curated related articles, in editor order. */
  related?: ArticleView[];
  /** Headings extracted from the body, for an optional table of contents. */
  outline?: OutlineEntry[];
}

export interface OutlineEntry {
  id: string;
  text: string;
  level: number;
}

/**
 * A page of results.
 *
 * `total` is the upstream count for the current filter, not an
 * estimate. `nextCursor` is intentionally omitted: Calliope uses
 * offset pagination, and the frontend mirrors that rather than
 * pretending a cursor exists.
 */
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages: number;
}
