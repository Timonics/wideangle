/**
 * Calliope response validation.
 *
 * Upstream responses are untrusted input. Everything that crosses the
 * adapter boundary is parsed with zod BEFORE it reaches a page
 * component. A malformed upstream payload must degrade to "no content",
 * never to a crash and never to unvalidated HTML.
 */

import { z } from 'zod';

const uuidSchema = z.string().uuid();

/** The upstream `content` column is a JSON block list. */
export const upstreamContentBlockSchema = z.object({
  type: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()).catch({}),
});

export const upstreamContentSchema = z
  .array(upstreamContentBlockSchema)
  .catch([]);

export const upstreamAuthorLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const upstreamAuthorSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  links: z.array(upstreamAuthorLinkSchema).catch([]),
});

export const upstreamTaxonomySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
});

/**
 * Structured cover image (extended contract). Replaces the legacy bare
 * `coverImageUrl` with alt text (accessibility), caption and credit
 * (editorial), and explicit dimensions (layout stability).
 */
export const upstreamCoverImageSchema = z.object({
  url: z.string(),
  alt: z.string().catch(''),
  caption: z.string().nullable().catch(null),
  credit: z.string().nullable().catch(null),
  width: z.number().int().positive().optional().catch(undefined),
  height: z.number().int().positive().optional().catch(undefined),
});

/** Follow-up / multipart posts: this article's place within a series. */
export const upstreamSeriesSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  /** 1-based position of THIS article within the series. */
  position: z.number().int().catch(0),
  /** Published-article count in the series. */
  total: z.number().int().catch(0),
});

export const upstreamCorrectionSchema = z.object({
  date: z.string(),
  note: z.string(),
});

export const upstreamSeoSchema = z.object({
  socialImageUrl: z.string().nullable().catch(null),
  socialTitle: z.string().nullable().catch(null),
  socialDescription: z.string().nullable().catch(null),
  noIndex: z.boolean().catch(false),
});

/**
 * Series detail response: `GET /v1/blogs/{blogId}/series/{slug}`.
 * Published articles ordered by series position.
 */
export const upstreamSeriesDetailSchema = z.object({
  data: z.object({
    id: uuidSchema,
    name: z.string(),
    slug: z.string(),
    articles: z.array(z.unknown()).catch([]),
  }),
});

/**
 * The upstream article schema.
 *
 * `related` is recursive (a related article can itself carry related
 * articles), so the schema is self-referential. The explicit type
 * annotation breaks the circular inference TypeScript would otherwise
 * reject with TS7022.
 */
export interface UpstreamArticleShape {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content: unknown;
  coverImage?: {
    url: string;
    alt: string;
    caption?: string | null;
    credit?: string | null;
    width?: number;
    height?: number;
  } | null;
  coverImageUrl?: string | null;
  featured?: boolean;
  series?: {
    id: string;
    name: string;
    slug: string;
    position: number;
    total: number;
  } | null;
  readingTimeMinutes?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  canonicalUrl?: string | null;
  locale?: string;
  corrections?: Array<{ date: string; note: string }>;
  seo?: {
    socialImageUrl?: string | null;
    socialTitle?: string | null;
    socialDescription?: string | null;
    noIndex?: boolean;
  };
  author: {
    id: string;
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
    links?: Array<{ label: string; url: string }>;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  related?: UpstreamArticleShape[];
}

export const upstreamArticleSchema: z.ZodType<UpstreamArticleShape> = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  content: upstreamContentSchema,
  coverImage: upstreamCoverImageSchema.nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  featured: z.boolean().catch(false),
  series: upstreamSeriesSchema.nullable().optional(),
  readingTimeMinutes: z.number().int().positive().nullable().catch(null),
  publishedAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  locale: z.string().optional(),
  corrections: z.array(upstreamCorrectionSchema).catch([]),
  seo: upstreamSeoSchema.optional(),
  author: upstreamAuthorSchema,
  category: upstreamTaxonomySchema.nullable().optional(),
  tags: z.array(upstreamTaxonomySchema).catch([]),
  related: z.array(z.lazy(() => upstreamArticleSchema)).optional(),
});

export type UpstreamArticle = UpstreamArticleShape;

export const upstreamEnvelopeSchema = z.object({
  data: z.array(z.unknown()).catch([]),
  meta: z
    .object({
      total: z.number().catch(0),
      page: z.number().catch(1),
      pageSize: z.number().catch(20),
    })
    .catch({ total: 0, page: 1, pageSize: 20 }),
});

/** A Calliope error body: `{ code, message }`. */
export const upstreamErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});
