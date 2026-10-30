import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategoryBySlug } from '@/lib/data';
import { isGenuineMissing } from '@/lib/errors';
import { categoryPath, isSafeSlug } from '@/lib/urls';
import { pageJsonLd } from '@/lib/seo';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';

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

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent">
              {config.publication.name}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <Link href="/articles" className="hover:text-accent">
              Articles
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category.name}</span>
          </li>
        </ol>
      </nav>

      <header className="relative mb-10 overflow-hidden rounded-3xl bg-[#181626] p-8 dark:bg-[#1e1c33] sm:p-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-10 select-none font-serif text-[10rem] font-bold leading-none text-accent/10"
        >
          {category.name.charAt(0).toUpperCase()}
        </span>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-accent via-accent/40 to-transparent"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              Category
            </p>
            <p className="rounded-full bg-accent/15 px-3 py-0.5 text-xs font-bold text-accent">
              {articles.total === 0
                ? 'No articles yet'
                : `${articles.total} ${articles.total === 1 ? 'article' : 'articles'}`}
            </p>
          </div>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {category.name}
          </h1>
          {category.description !== undefined ? (
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/60">
              {category.description}
            </p>
          ) : null}
        </div>
      </header>

      {articles.items.length === 0 ? (
        articles.total === 0 ? (
          <EmptyState
            title="Nothing filed here yet"
            action={{ href: '/articles', label: 'Browse the archive' }}
          >
            {`Stories filed under ${category.name} will appear here once published.`}
          </EmptyState>
        ) : (
          <EmptyState title="End of the category">
            This page is past the end of the archive for this category.
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
                  ? categoryPath(category.slug)
                  : `${categoryPath(category.slug)}?page=${articles.page - 1}`
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
              href={`${categoryPath(category.slug)}?page=${articles.page + 1}`}
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
  );
}
