import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategoryBySlug } from '@/lib/data';
import { isGenuineMissing } from '@/lib/errors';
import { categoryPath, isSafeSlug } from '@/lib/urls';
import { pageJsonLd } from '@/lib/seo';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 300;

const PAGE_SIZE = 12;

interface RouteParams {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;

  if (!isSafeSlug(slug)) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }

  try {
    const category = await getCategoryBySlug(slug);
    if (category === null) {
      return { title: 'Not found', robots: { index: false, follow: false } };
    }
    const description =
      category.description ??
      `Articles filed under ${category.name} in ${getConfig().publication.name}.`;

    return {
      title: category.name,
      description,
      alternates: { canonical: categoryPath(category.slug) },
      openGraph: {
        type: 'website',
        title: category.name,
        description,
      },
    };
  } catch {
    return { title: 'Temporarily unavailable', robots: { index: false, follow: false } };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: RouteParams) {
  const { slug } = await params;
  const { page: rawPage } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(parsed) ? parsed : 1;

  if (!isSafeSlug(slug)) {
    notFound();
  }

  let category;
  try {
    category = await getCategoryBySlug(slug);
  } catch (error) {
    if (isGenuineMissing(error)) {
      notFound();
    }
    throw error;
  }

  if (category === null) {
    notFound();
  }

  const articles = await getArticlePage({
    page,
    pageSize: PAGE_SIZE,
    categoryId: category.id,
  });

  const config = getConfig();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            pageJsonLd({
              name: category.name,
              description:
                category.description ??
                `Articles filed under ${category.name}.`,
              canonicalPath: categoryPath(category.slug),
              breadcrumb: [
                { name: config.publication.name, path: '/' },
                { name: 'Articles', path: '/articles' },
                { name: category.name, path: categoryPath(category.slug) },
              ],
            }),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              {config.publication.name}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <Link href="/articles" className="hover:underline">
              Articles
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category.name}</span>
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description !== undefined ? (
          <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
            {category.description}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-neutral-500">
          {articles.total === 0
            ? 'No articles in this category yet.'
            : `${articles.total} ${articles.total === 1 ? 'article' : 'articles'}.`}
        </p>
      </header>

      {articles.items.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          {articles.total === 0
            ? 'Nothing has been filed here yet.'
            : 'This page is past the end of the category.'}
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
                  ? categoryPath(category.slug)
                  : `${categoryPath(category.slug)}?page=${articles.page - 1}`
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
              href={`${categoryPath(category.slug)}?page=${articles.page + 1}`}
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
