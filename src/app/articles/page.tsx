import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategories } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { pageJsonLd } from '@/lib/seo';
import type { ArticleView } from '@/lib/types';
import { ArticleCard } from '@/components/ArticleCard';
import { SearchForm } from '@/components/SearchForm';
import { EmptyState } from '@/components/EmptyState';

export const revalidate = 300;

const PAGE_SIZE = 12;

// Search reads a few pages and filters them in memory; the cap keeps
// the query honest about its coverage.
const SEARCH_PAGES = 3;

interface RouteParams {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: RouteParams): Promise<Metadata> {
  const { page, q } = await searchParams;
  const query = (q ?? '').trim();

  if (query !== '') {
    // Search variants must not be indexed as separate pages.
    return {
      title: `Search: ${query}`,
      robots: { index: false, follow: false },
      alternates: { canonical: '/articles' },
    };
  }

  const pageNumber = Number.parseInt(page ?? '1', 10);
  const isFirst = !Number.isFinite(pageNumber) || pageNumber <= 1;
  const canonicalPath = isFirst ? '/articles' : `/articles?page=${pageNumber}`;

  const { publication } = getConfig();
  const description = isFirst
    ? `Every published article in ${publication.name}.`
    : `Page ${pageNumber} of published articles in ${publication.name}.`;

  return {
    title: isFirst ? 'Articles' : `Articles — page ${pageNumber}`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title: isFirst ? 'Articles' : `Articles — page ${pageNumber}`,
      description,
    },
  };
}

export default async function ArticlesPage({ searchParams }: RouteParams) {
  const { page: rawPage, q: rawQuery } = await searchParams;
  const query = (rawQuery ?? '').trim();
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(parsed) ? parsed : 1;

  const [articles, categories] = await Promise.all([
    getArticlePage({ page, pageSize: PAGE_SIZE }),
    getCategories(),
  ]);

  const matches =
    query !== ''
      ? (
          await Promise.all(
            Array.from({ length: SEARCH_PAGES }, (_, index) =>
              getArticlePage({ page: index + 1, pageSize: PAGE_SIZE }),
            ),
          )
        )
          .flatMap((result) => result.items)
          .filter((article) => matchesQuery(article, query))
      : [];

  const config = getConfig();
  const searching = query !== '';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            pageJsonLd({
              name: 'Articles',
              description: `Every published article in ${config.publication.name}.`,
              canonicalPath: page <= 1 ? '/articles' : `/articles?page=${page}`,
              breadcrumb: [
                { name: config.publication.name, path: '/' },
                { name: 'Articles', path: '/articles' },
              ],
            }),
          ),
        }}
      />

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {searching ? 'Search the archive' : 'The archive'}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          {searching ? `Results for “${query}”` : 'Articles'}
        </h1>
        <p className="mt-3 text-muted">
          {searching
            ? `${matches.length} ${matches.length === 1 ? 'story' : 'stories'} found in the latest ${SEARCH_PAGES * PAGE_SIZE} articles.`
            : articles.total === 0
              ? 'No articles have been published yet.'
              : `${articles.total} published ${articles.total === 1 ? 'article' : 'articles'} — newest first.`}
        </p>
        <div aria-hidden="true" className="mt-6 h-0.5 w-24 bg-accent" />
      </header>

      <div className="mb-10 max-w-2xl">
        <SearchForm query={query} large id="archive-search" />
      </div>

      {searching ? (
        matches.length === 0 ? (
          <EmptyState
            title={`No results for “${query}”`}
            action={{ href: '/articles', label: 'Browse the archive' }}
          >
            Try a different word, or browse the full archive.
          </EmptyState>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((article) => (
                <li
                  key={article.id}
                  className="rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl hover:shadow-accent/10"
                >
                  <ArticleCard article={article} headingLevel={3} image />
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-muted">
              Not what you meant?{' '}
              <Link
                href="/articles"
                className="font-semibold text-accent underline decoration-accent/45 underline-offset-4 transition-colors hover:decoration-accent"
              >
                Browse all articles →
              </Link>
            </p>
          </>
        )
      ) : (
        <>
          {categories.length > 0 ? (
            <nav aria-label="Categories" className="mb-10">
              <h2 className="sr-only">Browse by category</h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={categoryPath(category.slug)}
                      className="inline-block rounded-full border border-line px-3 py-1 transition-colors hover:border-accent hover:text-accent"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {articles.items.length === 0 ? (
            articles.total === 0 ? (
              <EmptyState title="Nothing here yet">
                The first story is on its way — check back soon.
              </EmptyState>
            ) : (
              <EmptyState title="End of the archive">
                This page is past the end of the archive.
              </EmptyState>
            )
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.items.map((article) => (
                <li
                  key={article.id}
                  className="rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl hover:shadow-accent/10"
                >
                  <ArticleCard article={article} headingLevel={3} image />
                </li>
              ))}
            </ul>
          )}

          {articles.totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-12 flex items-center justify-between border-t border-line pt-6"
            >
              {articles.hasPrevious ? (
                <Link
                  href={
                    articles.page - 1 <= 1
                      ? '/articles'
                      : `/articles?page=${articles.page - 1}`
                  }
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                  rel="prev"
                >
                  ← Newer
                </Link>
              ) : (
                <span />
              )}

              <p className="text-sm text-muted">
                Page {articles.page} of {articles.totalPages}
              </p>

              {articles.hasNext ? (
                <Link
                  href={`/articles?page=${articles.page + 1}`}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                  rel="next"
                >
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}

/**
 * Case-insensitive multi-term match: every term must appear somewhere
 * in the title, excerpt, author, tags, or categories.
 */
function matchesQuery(article: ArticleView, query: string): boolean {
  const haystack = [
    article.title,
    article.excerpt ?? '',
    article.author.name,
    ...article.tags.map((tag) => tag.name),
    ...article.categories.map((category) => category.name),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== '')
    .every((term) => haystack.includes(term));
}
