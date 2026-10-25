import { describe, it, expect } from 'vitest';
import {
  buildScopedUrl,
} from '@/lib/calliope/client';
import {
  clampPage,
  clampPageSize,
  toPageResult,
  buildOutline,
  toArticleView,
} from '@/lib/calliope/adapter';
import type { UpstreamArticle } from '@/lib/calliope/schema';

describe('buildScopedUrl', () => {
  const base = 'http://localhost:3002';
  const blog = '7604f178-68f6-4e65-9d79-de091b1ead15';

  it('scopes a path under the blog', () => {
    const url = buildScopedUrl(base, blog, 'articles');
    expect(url).toBe(`http://localhost:3002/v1/blogs/${blog}/articles`);
  });

  it('encodes a slug in the path', () => {
    const url = buildScopedUrl(base, blog, 'articles/some slug');
    expect(url).toContain('articles/some%20slug');
  });

  it('omits undefined query parameters', () => {
    const url = buildScopedUrl(base, blog, 'articles', {
      page: 2,
      pageSize: undefined,
    });
    expect(url).toContain('page=2');
    expect(url).not.toContain('pageSize');
  });

  it('does NOT send a publication scope when the upstream does not support it', () => {
    const url = buildScopedUrl(base, blog, 'articles', {}, 'pub-123', false);
    expect(url).not.toContain('publicationId');
  });

  it('sends a publication scope when the upstream supports it (AC-14)', () => {
    const url = buildScopedUrl(base, blog, 'articles', {}, 'pub-123', true);
    expect(url).toContain('publicationId=pub-123');
  });
});

describe('pagination clamping', () => {
  it('clamps the page size to the upstream maximum of 100', () => {
    expect(clampPageSize(500)).toBe(100);
  });

  it('clamps the page size to at least 1', () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
  });

  it('clamps the page number to the upstream maximum of 10000', () => {
    expect(clampPage(99999)).toBe(10_000);
  });

  it('never returns a page below 1', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(undefined)).toBe(1);
  });
});

describe('toPageResult', () => {
  it('computes pagination flags from the upstream total', () => {
    const result = toPageResult([1, 2, 3], { total: 7, page: 1, pageSize: 3 });
    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(false);
  });

  it('marks the last page as having no next', () => {
    const result = toPageResult([7], { total: 7, page: 3, pageSize: 3 });
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(true);
  });

  it('reports at least one page for an empty result', () => {
    const result = toPageResult([], { total: 0, page: 1, pageSize: 12 });
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
  });
});

describe('buildOutline', () => {
  it('derives heading ids and keeps them unique', () => {
    const { outline, headingIds } = buildOutline([
      { type: 'heading', data: { text: 'The leak', level: 2 } },
      { type: 'paragraph', data: { text: 'body' } },
      { type: 'heading', data: { text: 'The leak', level: 3 } },
    ]);

    expect(outline.map((entry) => entry.id)).toEqual(['the-leak', 'the-leak-1']);
    expect(outline.map((entry) => entry.level)).toEqual([2, 3]);
    // The map must point at the SAME indices the renderer walks.
    expect(headingIds.get(0)).toBe('the-leak');
    expect(headingIds.get(2)).toBe('the-leak-1');
    expect(headingIds.has(1)).toBe(false);
  });

  it('ignores non-heading blocks and empty headings', () => {
    const { outline } = buildOutline([
      { type: 'paragraph', data: { text: 'not a heading' } },
      { type: 'heading', data: { text: '   ' } },
    ]);
    expect(outline).toHaveLength(0);
  });

  it('clamps the heading level into the 2..6 range', () => {
    const { outline } = buildOutline([
      { type: 'heading', data: { text: 'H1', level: 1 } },
      { type: 'heading', data: { text: 'H9', level: 9 } },
    ]);
    expect(outline[0].level).toBe(2);
    expect(outline[1].level).toBe(6);
  });
});

describe('toArticleView', () => {
  const baseArticle: UpstreamArticle = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'why-we-rebuilt-the-content-api',
    title: 'Why we rebuilt the content API',
    excerpt: 'The old API leaked draft slugs.',
    content: [{ type: 'paragraph', data: { text: 'Hello' } }],
    coverImageUrl: null,
    publishedAt: '2026-10-12T10:00:00.000Z',
    author: {
      id: 'a1111111-1111-4111-8111-111111111111',
      name: 'Michael Oderinde',
      bio: 'Software engineer.',
      avatarUrl: null,
    },
    category: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Engineering',
      slug: 'engineering',
    },
    tags: [{ id: 'd1', name: 'TypeScript', slug: 'typescript' }],
  };

  it('maps the upstream shape onto the frontend view', () => {
    const view = toArticleView(baseArticle);
    expect(view.title).toBe('Why we rebuilt the content API');
    expect(view.excerpt).toBe('The old API leaked draft slugs.');
    expect(view.publishedAt).toBe('2026-10-12T10:00:00.000Z');
    expect(view.author.name).toBe('Michael Oderinde');
    expect(view.categories).toHaveLength(1);
    expect(view.tags).toHaveLength(1);
    expect(view.body).toHaveLength(1);
  });

  it('drops an empty excerpt rather than rendering a blank line', () => {
    const view = toArticleView({ ...baseArticle, excerpt: '   ' });
    expect(view.excerpt).toBeUndefined();
  });

  it('substitutes a title for an empty upstream title', () => {
    const view = toArticleView({ ...baseArticle, title: '' });
    expect(view.title).toBe('Untitled');
  });

  it('normalises a non-array content payload to an empty body', () => {
    const view = toArticleView({ ...baseArticle, content: 'not an array' });
    expect(view.body).toEqual([]);
  });

  it('drops content blocks with no type', () => {
    const view = toArticleView({
      ...baseArticle,
      content: [
        { type: 'paragraph', data: { text: 'keep' } },
        { data: { text: 'drop' } } as never,
      ],
    });
    expect(view.body).toHaveLength(1);
  });

  it('does not invent a modification date when the upstream omits one', () => {
    const view = toArticleView(baseArticle);
    expect(view.modifiedAt).toBeUndefined();
  });

  it('carries a modification date through when the upstream publishes one', () => {
    const view = toArticleView({
      ...baseArticle,
      updatedAt: '2026-10-20T08:00:00.000Z',
    });
    expect(view.modifiedAt).toBe('2026-10-20T08:00:00.000Z');
  });

  it('has no category when the upstream has none', () => {
    const view = toArticleView({ ...baseArticle, category: null });
    expect(view.categories).toEqual([]);
  });

  it('drops a hero image with an unsafe URL (AC-11)', () => {
    const view = toArticleView({
      ...baseArticle,
      coverImageUrl: 'javascript:alert(1)',
    });
    expect(view.heroImage).toBeUndefined();
  });

  it('keeps a hero image with a safe URL', () => {
    const view = toArticleView({
      ...baseArticle,
      coverImageUrl: 'https://cdn.example.com/a.png',
    });
    expect(view.heroImage?.url).toBe('https://cdn.example.com/a.png');
  });
});
