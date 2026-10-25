import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategories } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 300;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    // `absolute` prevents the root layout's title template from
    // appending the publication name a second time.
    title: { absolute: publication.name },
    description: publication.description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      title: publication.name,
      description: publication.description,
      url: publication.canonicalOrigin,
    },
  };
}

export default async function HomePage() {
  const { publication } = getConfig();

  // Both reads are independent — fetch them concurrently rather than
  // serialising the latency.
  const [articles, categories] = await Promise.all([
    getArticlePage({ page: 1, pageSize: 10 }),
    getCategories(),
  ]);

  const categoriesWithContent = categories.filter((category) =>
    articles.items.some((article) =>
      article.categories.some((c) => c.slug === category.slug),
    ),
  );

  return (
    <>
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {publication.name}
        </h1>
        <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-300">
          {publication.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/articles"
            className="rounded border border-neutral-900 bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Read the archive
          </Link>
          <Link
            href="/about"
            className="rounded border border-neutral-300 px-4 py-2 font-medium hover:border-neutral-500 dark:border-neutral-700"
          >
            About this publication
          </Link>
        </div>
      </section>

      {categoriesWithContent.length > 0 ? (
        <nav aria-label="Categories" className="mb-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Categories
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categoriesWithContent.map((category) => (
              <li key={category.id}>
                <Link
                  href={categoryPath(category.slug)}
                  className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-sm hover:border-neutral-500 dark:border-neutral-700"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" className="mb-4 text-xl font-semibold">
          Latest articles
        </h2>

        {articles.items.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            No articles have been published yet. The archive is ready for the
            first one.
          </p>
        ) : (
          <ul className="space-y-6">
            {articles.items.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}

        {articles.hasNext ? (
          <p className="mt-8">
            <Link href="/articles" className="font-medium underline">
              Browse all {articles.total} articles
            </Link>
          </p>
        ) : null}
      </section>
    </>
  );
}
