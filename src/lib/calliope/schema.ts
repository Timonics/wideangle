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

export const upstreamAuthorSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const upstreamTaxonomySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
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
  excerpt?: string | null;
  content: unknown;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author: {
    id: string;
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
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
  excerpt: z.string().nullable().optional(),
  content: upstreamContentSchema,
  coverImageUrl: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
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

export type UpstreamEnvelope = z.infer<typeof upstreamEnvelopeSchema>;

/** A Calliope error body: `{ code, message }`. */
export const upstreamErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

export type UpstreamError = z.infer<typeof upstreamErrorSchema>;
