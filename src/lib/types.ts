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

export interface AuthorLinkView {
  label: string;
  url: string;
}

export interface AuthorView {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  links?: AuthorLinkView[];
}

export interface HeroImageView {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
  credit?: string;
}

/** This article's place within a follow-up series (extended contract). */
export interface SeriesView {
  id: string;
  name: string;
  slug: string;
  /** 1-based position of this article within the series. */
  position: number;
  /** Number of published articles in the series. */
  total: number;
}

export interface SeriesDetailView {
  id: string;
  name: string;
  slug: string;
  articles: ArticleView[];
}

export interface CorrectionView {
  date: string;
  note: string;
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
  /** One-line standfirst shown under the title (extended contract). */
  subtitle?: string;
  excerpt?: string;
  /** Validated content blocks. */
  body: ContentBlock[];
  /** ISO-8601 publish timestamp. Always present for public articles. */
  publishedAt: string;
  /**
   * ISO-8601 modification timestamp, when the upstream publishes one.
   * Rendered as an "Updated …" line and emitted as `dateModified` in
   * JSON-LD; never invented when absent.
   */
  modifiedAt?: string;
  /** Editor-picked homepage hero candidate (extended contract). */
  featured: boolean;
  series?: SeriesView;
  /** Upstream-provided reading time; rendered next to the byline. */
  readingTimeMinutes?: number;
  /** External canonical URL, for cross-posts/syndication. */
  canonicalUrl?: string;
  /** Visible editorial record, rendered as a banner (extended contract). */
  corrections: CorrectionView[];
  locale?: string;
  author: AuthorView;
  categories: TaxonomyView[];
  tags: TaxonomyView[];
  heroImage?: HeroImageView;
  seo?: {
    socialTitle?: string;
    socialDescription?: string;
    socialImageUrl?: string;
    noIndex?: boolean;
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
