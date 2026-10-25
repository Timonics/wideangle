import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticle } from '@/lib/data';
import { isGenuineMissing, isUpstreamUnavailable } from '@/lib/errors';
import { articlePath, categoryPath, isSafeSlug } from '@/lib/urls';
import {
  articleCanonical,
  articleDescription,
  articleJsonLd,
  articleTitle,
  formatDate,
  pageJsonLd,
} from '@/lib/seo';
import { ArticleBody } from '@/components/ArticleBody';
import { buildOutline } from '@/lib/calliope/adapter';
import { safeUrl } from '@/lib/render/safe';

export const revalidate = 300;
export const dynamicParams = true;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;

  if (!isSafeSlug(slug)) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }

  try {
    const article = await getArticle(slug);
    const canonical = articleCanonical(article);
    const description = articleDescription(article);
    const socialImage = safeUrl(
      article.seo?.socialImageUrl ?? article.heroImage?.url,
    );
    const socialImageList =
      socialImage === null ? undefined : [socialImage];

    return {
      title: articleTitle(article),
      description,
      alternates: { canonical },
      openGraph: {
        type: 'article',
        title: article.title,
        description,
        url: canonical,
        siteName: getConfig().publication.name,
        locale: getConfig().publication.locale,
        publishedTime: article.publishedAt,
        // Only a GENUINE modification date is emitted. When the
        // upstream does not publish one the field is omitted entirely
        // rather than filled with the current time.
        ...(article.modifiedAt === undefined
          ? {}
          : { modifiedTime: article.modifiedAt }),
        authors: [article.author.name],
        ...(socialImageList === undefined
          ? {}
          : { images: socialImageList }),
      },
      twitter: {
        card: socialImageList === undefined ? 'summary' : 'summary_large_image',
        title: article.title,
        description,
        ...(socialImageList === undefined
          ? {}
          : { images: socialImageList }),
      },
      robots: { index: true, follow: true },
    };
  } catch (error) {
    if (isGenuineMissing(error)) {
      return { title: 'Not found', robots: { index: false, follow: false } };
    }
    // An upstream failure must not be reported as "not found" to a
    // crawler — it is a transient service problem, not a missing page.
    return {
      title: 'Temporarily unavailable',
      robots: { index: false, follow: false },
    };
  }
}

export default async function ArticlePage({ params }: RouteParams) {
  const { slug } = await params;

  if (!isSafeSlug(slug)) {
    notFound();
  }

  let article;
  try {
    article = await getArticle(slug);
  } catch (error) {
    if (isGenuineMissing(error)) {
      // Genuinely missing (or unpublished) → a real 404. The upstream
      // answers a draft slug exactly like an unknown slug, so this
      // leaks nothing about unpublished content (AC-04).
      notFound();
    }
    if (isUpstreamUnavailable(error)) {
      // The upstream is unreachable. This is NOT a missing article.
      // Rendering the error boundary keeps the status a 5xx rather
      // than a permanent 404 (AC-08).
      throw error;
    }
    throw error;
  }

  const { outline, headingIds } = buildOutline(article.body);
  const config = getConfig();

  return (
    <>
      <script
        type="application/ld+json"
        // The payload is built from validated config + validated
        // upstream strings. JSON.stringify escapes it for a script
        // context; no upstream HTML is involved.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd(article)),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              {config.publication.name}
            </Link>
          </li>
          {article.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                href={categoryPath(category.slug)}
                className="hover:underline"
              >
                {category.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-neutral-700 dark:text-neutral-300">
              {article.title}
            </span>
          </li>
        </ol>
      </nav>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {article.publishedAt !== '' ? (
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
            ) : null}
            {article.author.name !== '' ? (
              <>
                <span aria-hidden="true">·</span>
                <span>By {article.author.name}</span>
              </>
            ) : null}
            {article.modifiedAt !== undefined ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated{' '}
                  <time dateTime={article.modifiedAt}>
                    {formatDate(article.modifiedAt)}
                  </time>
                </span>
              </>
            ) : null}
          </p>

          {article.excerpt !== undefined ? (
            <p className="mt-4 text-lg text-neutral-700 dark:text-neutral-300">
              {article.excerpt}
            </p>
          ) : null}
        </header>

        {outline.length >= 2 ? (
          <nav
            aria-labelledby="toc-heading"
            className="mb-10 rounded border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <h2
              id="toc-heading"
              className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500"
            >
              On this page
            </h2>
            <ul className="space-y-1 text-sm">
              {outline.map((entry) => (
                <li
                  key={entry.id}
                  style={{ paddingLeft: `${(entry.level - 2) * 0.75}rem` }}
                >
                  <a href={`#${entry.id}`} className="hover:underline">
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <ArticleBody blocks={article.body} headingIds={headingIds} />

        {article.tags.length > 0 ? (
          <footer className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Tags
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {article.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </article>

      {article.related !== undefined && article.related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-14">
          <h2 id="related-heading" className="mb-4 text-xl font-semibold">
            Related articles
          </h2>
          <ul className="space-y-4">
            {article.related.map((related) => (
              <li key={related.id}>
                <Link
                  href={articlePath(related.slug)}
                  className="font-medium hover:underline"
                >
                  {related.title}
                </Link>
                {related.publishedAt !== '' ? (
                  <span className="ml-2 text-sm text-neutral-500">
                    <time dateTime={related.publishedAt}>
                      {formatDate(related.publishedAt)}
                    </time>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            pageJsonLd({
              name: article.title,
              description: articleDescription(article),
              canonicalPath: articlePath(article.slug),
              breadcrumb: [
                { name: config.publication.name, path: '/' },
                ...article.categories.map((category) => ({
                  name: category.name,
                  path: categoryPath(category.slug),
                })),
                { name: article.title, path: articlePath(article.slug) },
              ],
            }),
          ),
        }}
      />
    </>
  );
}
