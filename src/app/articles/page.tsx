import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategories } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { pageJsonLd } from '@/lib/seo';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 300;

const PAGE_SIZE = 12;

interface RouteParams {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: RouteParams): Promise<Metadata> {
  const { page } = await searchParams;
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
  const { page: rawPage } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(parsed) ? parsed : 1;

  const [articles, categories] = await Promise.all([
    getArticlePage({ page, pageSize: PAGE_SIZE }),
    getCategories(),
  ]);

  const config = getConfig();

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
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          {articles.total === 0
            ? 'No articles have been published yet.'
            : `${articles.total} published ${articles.total === 1 ? 'article' : 'articles'}.`}
        </p>
      </header>

      {categories.length > 0 ? (
        <nav aria-label="Categories" className="mb-10">
          <h2 className="sr-only">Browse by category</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={categoryPath(category.slug)}
                  className="inline-block rounded-full border border-neutral-300 px-3 py-1 hover:border-neutral-500 dark:border-neutral-700"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {articles.items.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          {articles.total === 0
            ? 'There is nothing here yet.'
            : 'This page is past the end of the archive.'}
        </p>
      ) : (
        <ul className="space-y-8">
          {articles.items.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      )}

      {articles.totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          {articles.hasPrevious ? (
            <Link
              href={
                articles.page - 1 <= 1
                  ? '/articles'
                  : `/articles?page=${articles.page - 1}`
              }
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-neutral-500 dark:border-neutral-700"
              rel="prev"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}

          <p className="text-sm text-neutral-500">
            Page {articles.page} of {articles.totalPages}
          </p>

          {articles.hasNext ? (
            <Link
              href={`/articles?page=${articles.page + 1}`}
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-neutral-500 dark:border-neutral-700"
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
  );
}
