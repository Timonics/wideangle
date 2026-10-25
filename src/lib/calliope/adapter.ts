/**
 * The adapter: Calliope responses → WideAngle frontend models.
 *
 * This is the ONLY module that knows the upstream wire format. Page
 * components depend on `ArticleView` / `PageResult` and never on
 * Calliope's shape. Keeping that boundary clean is what makes a
 * future upstream change (or a publication-scoped API) an adapter
 * change rather than a template rewrite.
 */

import { safeUrl } from '../render/safe';
import type {
  ArticleView,
  AuthorView,
  ContentBlock,
  HeroImageView,
  OutlineEntry,
  PageResult,
  TaxonomyView,
} from '../types';
import {
  calliopeGetEnvelope,
  calliopeGetOne,
  UpstreamNotFoundError,
} from './client';
import { upstreamArticleSchema } from './schema';
import type { UpstreamArticle } from './schema';

/** Maximum article body length Calliope accepts. */
const MAX_BLOCKS = 200;

const DEFAULT_PAGE_SIZE = 12;
/** Calliope caps `pageSize` at 100. */
const MAX_PAGE_SIZE = 100;

/**
 * Convert a Calliope article into the frontend view.
 *
 * Everything here is defensive: upstream fields are typed but their
 * *content* is not trustworthy (a `title` may be empty, a `slug` may
 * contain characters that would break a URL, a `content` payload may
 * be structurally wrong).
 */
export function toArticleView(article: UpstreamArticle): ArticleView {
  const body = normaliseBlocks(article.content);
  const author = toAuthorView(article.author);
  const title = article.title.trim() === '' ? 'Untitled' : article.title;
  const heroImage = toHeroImage(article.coverImageUrl, title);

  const view: ArticleView = {
    id: article.id,
    slug: article.slug,
    title,
    ...(article.excerpt != null && article.excerpt.trim() !== ''
      ? { excerpt: article.excerpt }
      : {}),
    body,
    publishedAt: article.publishedAt ?? '',
    ...(article.updatedAt != null ? { modifiedAt: article.updatedAt } : {}),
    author,
    categories: article.category != null ? [toTaxonomy(article.category)] : [],
    tags: (article.tags ?? []).map(toTaxonomy),
    ...(heroImage === undefined ? {} : { heroImage }),
    ...(article.related === undefined
      ? {}
      : { related: article.related.map(toArticleView) }),
  };

  const { outline } = buildOutline(body);
  if (outline.length > 0) {
    view.outline = outline;
  }

  return view;
}

function toAuthorView(author: UpstreamArticle['author']): AuthorView {
  return {
    id: author.id,
    name: author.name,
    ...(author.bio != null && author.bio.trim() !== '' ? { bio: author.bio } : {}),
    ...(author.avatarUrl != null && author.avatarUrl.trim() !== ''
      ? { imageUrl: author.avatarUrl }
      : {}),
  };
}

function toTaxonomy(taxonomy: {
  id: string;
  name: string;
  slug: string;
}): TaxonomyView {
  return { id: taxonomy.id, name: taxonomy.name, slug: taxonomy.slug };
}

/**
 * A hero image needs alt text. The upstream stores only a URL, so the
 * alt text is derived from the article title rather than invented
 * separately — an empty alt would hide the image from screen readers.
 *
 * The URL is validated with the same allowlist the body renderer uses.
 * Without that, an upstream `javascript:` cover URL would reach the
 * `og:image` / `twitter:image` meta tags, where some crawlers and
 * scrapers will happily execute it.
 */
function toHeroImage(
  coverImageUrl: string | null | undefined,
  title: string,
): HeroImageView | undefined {
  if (coverImageUrl == null || coverImageUrl.trim() === '') {
    return undefined;
  }
  const url = safeUrl(coverImageUrl);
  if (url === null) {
    return undefined;
  }
  return { url, alt: title };
}

/**
 * Normalise the content block list.
 *
 * The upstream format is deliberately editor-agnostic: `{ type, data }`
 * with no per-type schema. WideAngle therefore defines the *render*
 * contract, not the *storage* contract. Blocks whose type is not in
 * the known vocabulary are still carried through (so a future renderer
 * can support them), but their data is preserved as-is and the
 * renderer degrades safely.
 */
function normaliseBlocks(content: unknown): ContentBlock[] {
  if (!Array.isArray(content)) {
    return [];
  }
  return content
    .filter(
      (block): block is { type: string; data: Record<string, unknown> } =>
        typeof block === 'object' &&
        block !== null &&
        typeof (block as { type?: unknown }).type === 'string' &&
        (block as { type: string }).type.length > 0,
    )
    .slice(0, MAX_BLOCKS)
    .map((block) => ({
      type: block.type,
      data:
        typeof block.data === 'object' && block.data !== null
          ? (block.data as Record<string, unknown>)
          : {},
    }));
}

/**
 * Derive heading ids from heading blocks.
 *
 * Ids are generated from the heading text plus an occurrence counter so
 * they stay stable across renders and unique within an article.
 *
 * Returns both the outline (for the table of contents) and a map from
 * block index → heading id, so the renderer can attach the SAME id to
 * the heading element that the outline links to. Computing them in one
 * pass is what keeps the two in sync.
 */
export function buildOutline(blocks: ContentBlock[]): {
  outline: OutlineEntry[];
  headingIds: Map<number, string>;
} {
  const outline: OutlineEntry[] = [];
  const headingIds = new Map<number, string>();
  const seen = new Map<string, number>();

  blocks.forEach((block, index) => {
    if (block.type !== 'heading') {
      return;
    }
    const text = readString(block.data.text);
    if (text === undefined) {
      return;
    }
    const level = readHeadingLevel(block.data.level);
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    outline.push({ id, text, level });
    headingIds.set(index, id);
  });

  return { outline, headingIds };
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readHeadingLevel(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(6, Math.max(2, Math.round(value)));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(6, Math.max(2, parsed));
    }
  }
  return 2;
}

function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'section' : slug;
}

/** Clamp a requested page size into the range Calliope accepts. */
export function clampPageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || !Number.isFinite(pageSize)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)));
}

/** Clamp a requested page number into Calliope's accepted range. */
export function clampPage(page: number | undefined): number {
  if (page === undefined || !Number.isFinite(page)) {
    return 1;
  }
  return Math.min(10_000, Math.max(1, Math.trunc(page)));
}

/** Build a page result from an upstream envelope. */
export function toPageResult<T>(
  items: T[],
  meta: { total: number; page: number; pageSize: number },
): PageResult<T> {
  const pageSize = meta.pageSize > 0 ? meta.pageSize : DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(meta.total / pageSize));
  return {
    items,
    page: meta.page,
    pageSize,
    total: meta.total,
    hasNext: meta.page < totalPages,
    hasPrevious: meta.page > 1,
    totalPages,
  };
}

/**
 * Fetch a page of published articles.
 *
 * Only published content is ever requested: the public route serves
 * published content by construction, and no query parameter is sent
 * that could widen the result set.
 */
export async function fetchArticlePage(options: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  tagId?: string;
}): Promise<PageResult<ArticleView>> {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);

  const envelope = await calliopeGetEnvelope({
    path: 'articles',
    query: {
      page,
      pageSize,
      ...(options.categoryId === undefined
        ? {}
        : { categoryId: options.categoryId }),
      ...(options.tagId === undefined ? {} : { tagId: options.tagId }),
    },
  });

  const items = envelope.data
    .map((raw) => upstreamArticleSchema.safeParse(raw))
    .filter((parsed) => parsed.success)
    .map((parsed) => toArticleView(parsed.data));

  return toPageResult(items, {
    total: envelope.total,
    page: envelope.page,
    pageSize: envelope.pageSize,
  });
}

/**
 * Fetch a single published article by slug.
 *
 * Throws `UpstreamNotFoundError` when the article does not exist or
 * is not published — upstream answers a draft slug exactly like an
 * unknown slug, so there is no existence leak.
 */
export async function fetchArticleBySlug(slug: string): Promise<ArticleView> {
  const article = await calliopeGetOne(
    { path: `articles/${encodeURIComponent(slug)}`, query: { include: 'related' } },
    upstreamArticleSchema,
  );
  return toArticleView(article);
}

/** Fetch every published article (used by the sitemap and the feed). */
export async function fetchAllPublishedArticles(
  maxArticles = 5_000,
): Promise<ArticleView[]> {
  const collected: ArticleView[] = [];
  let page = 1;
  const pageSize = MAX_PAGE_SIZE;

  // Bounded loop: the page count is derived from the upstream total,
  // and the hard ceiling protects against a runaway upstream.
  for (;;) {
    const envelope = await calliopeGetEnvelope({
      path: 'articles',
      query: { page, pageSize },
    });

    const items = envelope.data
      .map((raw) => upstreamArticleSchema.safeParse(raw))
      .filter((parsed) => parsed.success)
      .map((parsed) => toArticleView(parsed.data));

    collected.push(...items);

    if (items.length === 0 || collected.length >= maxArticles) {
      break;
    }
    if (items.length < pageSize) {
      break;
    }
    page += 1;
    if (page > 10_000) {
      break;
    }
  }

  return collected;
}

/** Fetch the category list. */
export async function fetchCategories(): Promise<
  Array<TaxonomyView & { description?: string }>
> {
  const envelope = await calliopeGetEnvelope({ path: 'categories' });
  return envelope.data.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return [];
    }
    const candidate = raw as {
      id?: unknown;
      name?: unknown;
      slug?: unknown;
      description?: unknown;
    };
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.slug !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: candidate.id,
        name: candidate.name,
        slug: candidate.slug,
        ...(typeof candidate.description === 'string' && candidate.description !== ''
          ? { description: candidate.description }
          : {}),
      },
    ];
  });
}

/** Look up a category by slug. Returns null when there is no match. */
export async function findCategoryBySlug(
  slug: string,
): Promise<(TaxonomyView & { description?: string }) | null> {
  const categories = await fetchCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

/** The publication's authors (public projection). */
export async function fetchAuthors(): Promise<AuthorView[]> {
  const envelope = await calliopeGetEnvelope({ path: 'authors' });
  return envelope.data.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return [];
    }
    const candidate = raw as {
      id?: unknown;
      name?: unknown;
      bio?: unknown;
      avatarUrl?: unknown;
    };
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.name !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: candidate.id,
        name: candidate.name,
        ...(typeof candidate.bio === 'string' && candidate.bio.trim() !== ''
          ? { bio: candidate.bio }
          : {}),
        ...(typeof candidate.avatarUrl === 'string' &&
        candidate.avatarUrl.trim() !== ''
          ? { imageUrl: candidate.avatarUrl }
          : {}),
      },
    ];
  });
}

export { UpstreamNotFoundError };
