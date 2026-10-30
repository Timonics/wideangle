import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticle, getArticlePage } from '@/lib/data';
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
import { ArticleCard } from '@/components/ArticleCard';
import { StoryRail } from '@/components/StoryRail';
import { buildOutline } from '@/lib/calliope/adapter';
import { readPlainText, safeUrl } from '@/lib/render/safe';

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
  const primaryCategory = article.categories[0];

  // Sidebar and "More on" rails are decorative: a failure here must
  // never turn an otherwise-healthy article into an error page, so
  // each read is isolated and degrades to "section hidden".
  const [morePage, categoryPage] = await Promise.all([
    fetchSafely(() => getArticlePage({ page: 1, pageSize: 5 })),
    primaryCategory !== undefined
      ? fetchSafely(() =>
          getArticlePage({
            page: 1,
            pageSize: 4,
            categoryId: primaryCategory.id,
          }),
        )
      : Promise.resolve(null),
  ]);

  const related = (article.related ?? [])
    .filter((item) => item.slug !== article.slug)
    .slice(0, 4);
  const moreArticles = (morePage?.items ?? [])
    .filter((item) => item.slug !== article.slug)
    .slice(0, 4);
  const categoryStories = (categoryPage?.items ?? [])
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);
  const readNext = [
    ...moreArticles,
    ...related.filter(
      (item) => !moreArticles.some((other) => other.slug === item.slug),
    ),
  ].slice(0, 3);

  // Open with a visual even when the CMS has no dedicated hero: fall
  // back to the article's first inline image (which is then skipped in
  // the body so it is not shown twice).
  let heroImage = article.heroImage;
  let heroBlockIndex: number | undefined;
  if (heroImage === undefined) {
    for (const [index, block] of article.body.entries()) {
      if (block.type === 'image') {
        const url = safeUrl(block.data.url);
        if (url !== null) {
          heroImage = { url, alt: readPlainText(block.data, 'alt') ?? '' };
          heroBlockIndex = index;
          break;
        }
      }
    }
  }

  // The site container is wide for the magazine grids; long-form
  // reading stays at a comfortable measure.
  return (
    <div className="mx-auto max-w-6xl">
      <script
        type="application/ld+json"
        // The payload is built from validated config + validated
        // upstream strings. JSON.stringify escapes it for a script
        // context; no upstream HTML is involved.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd(article)),
        }}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent">
              {config.publication.name}
            </Link>
          </li>
          {article.categories.map((category) => (
            <li key={category.id} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                href={categoryPath(category.slug)}
                className="hover:text-accent"
              >
                {category.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {article.title}
            </span>
          </li>
        </ol>
      </nav>

      <article>
        {heroImage !== undefined ? (
          <figure className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element --
                Editor-chosen CDN image; not available to next/image at
                build time. Explicit dims keep CLS at zero. */}
            <img
              src={heroImage.url}
              alt={heroImage.alt}
              width={heroImage.width}
              height={heroImage.height}
              className="aspect-[21/9] w-full rounded-2xl object-cover"
            />
            {heroImage.alt !== '' ? (
              <figcaption className="mt-2 text-center text-xs text-muted">
                {heroImage.alt}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <header className="mb-8 text-center">
          {article.categories[0] !== undefined ? (
            <p>
              <Link
                href={categoryPath(article.categories[0].slug)}
                className="inline-block rounded-full bg-accent/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-white"
              >
                {article.categories[0].name}
              </Link>
            </p>
          ) : null}

          <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>

          {article.excerpt !== undefined ? (
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted">
              {article.excerpt}
            </p>
          ) : null}

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
            {article.publishedAt !== '' ? (
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
            ) : null}
            {article.author.name !== '' ? (
              <>
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
                <span>
                  By{' '}
                  <span className="font-medium text-ink">
                    {article.author.name}
                  </span>
                </span>
              </>
            ) : null}
            {article.modifiedAt !== undefined ? (
              <>
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
                <span>
                  Updated{' '}
                  <time dateTime={article.modifiedAt}>
                    {formatDate(article.modifiedAt)}
                  </time>
                </span>
              </>
            ) : null}
          </p>
        </header>

        {outline.length >= 2 ? (
          <nav
            aria-labelledby="toc-heading"
            className="mb-10 rounded-lg border border-line bg-surface/50 p-4"
          >
            <h2
              id="toc-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent"
            >
              On this page
            </h2>
            <ul className="space-y-1 text-sm">
              {outline.map((entry) => (
                <li
                  key={entry.id}
                  style={{ paddingLeft: `${(entry.level - 2) * 0.75}rem` }}
                >
                  <a
                    href={`#${entry.id}`}
                    className="text-muted underline decoration-transparent underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <ArticleBody
          blocks={article.body}
          headingIds={headingIds}
          skipBlockIndex={heroBlockIndex}
        />

        {article.tags.length > 0 ? (
          <footer className="mt-12 border-t border-line pt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Tags
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {article.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full bg-surface px-2.5 py-1 text-muted"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </article>

          <ShareRow url={articleCanonical(article)} title={article.title} />

          {readNext.length > 0 ? (
            <section aria-labelledby="read-next-heading" className="mt-10">
              <h2
                id="read-next-heading"
                className="font-serif text-2xl font-semibold tracking-tight"
              >
                Read next
              </h2>
              <ul className="mt-4 space-y-3">
                {readNext.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={articlePath(item.slug)}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 transition-colors hover:border-accent"
                    >
                      <span className="font-medium transition-colors group-hover:text-accent">
                        {item.title}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1"
                      >
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className="space-y-10 lg:sticky lg:top-32">
            {related.length > 0 ? (
              <StoryRail
                id="related-posts"
                title="Related posts"
                articles={related}
              />
            ) : null}
            {moreArticles.length > 0 ? (
              <StoryRail
                id="more-articles"
                title="More articles"
                articles={moreArticles}
              />
            ) : null}
          </div>
        </aside>
      </div>

      {primaryCategory !== undefined && categoryStories.length > 0 ? (
        <section aria-labelledby="more-on-heading" className="mt-16">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="more-on-heading"
              className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              More on {primaryCategory.name}
            </h2>
            <Link
              href={categoryPath(primaryCategory.slug)}
              className="text-sm font-semibold text-accent underline decoration-accent/45 underline-offset-4 transition-colors hover:decoration-accent"
            >
              See all {primaryCategory.name} coverage →
            </Link>
          </div>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {categoryStories.map((story) => (
              <li key={story.id}>
                <ArticleCard article={story} headingLevel={3} image />
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
    </div>
  );
}

/**
 * A decorative read must never take the article down with it — the
 * page itself has already succeeded by this point.
 */
async function fetchSafely<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher();
  } catch {
    return null;
  }
}

/**
 * Plain-anchor share links (no JavaScript). External sharers open in a
 * new tab; the email share uses mailto.
 */
function ShareRow({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        Share this post
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
