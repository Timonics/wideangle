import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticle, getArticlePage, getSeries } from '@/lib/data';
import { isGenuineMissing, isUpstreamUnavailable } from '@/lib/errors';
import { articlePath, categoryPath, isSafeSlug } from '@/lib/urls';
import {
  articleCanonical,
  articleDescription,
  articleHasUpdate,
  articleJsonLd,
  articleNoIndex,
  articleSocial,
  articleTitle,
  formatDate,
  pageJsonLd,
} from '@/lib/seo';
import { ArticleBody } from '@/components/ArticleBody';
import { ArticleCard } from '@/components/ArticleCard';
import SmartImage from '@/components/SmartImage';
import { BrandMark } from '@/components/Logo';
import { StoryRail } from '@/components/StoryRail';
import { buildOutline } from '@/lib/calliope/adapter';
import { readPlainText, safeUrl } from '@/lib/render/safe';
import type { ArticleView, SeriesView } from '@/lib/types';

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
    const social = articleSocial(article);
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
        title: social.title,
        description: social.description,
        url: canonical,
        siteName: getConfig().publication.name,
        locale: getConfig().publication.locale,
        publishedTime: article.publishedAt,
        // Only a GENUINE, later modification date is emitted. An
        // `updatedAt` that merely mirrors the publish time is omitted
        // rather than reported as a revision.
        ...(articleHasUpdate(article)
          ? { modifiedTime: article.modifiedAt }
          : {}),
        authors: [article.author.name],
        ...(socialImageList === undefined
          ? {}
          : { images: socialImageList }),
      },
      twitter: {
        card: socialImageList === undefined ? 'summary' : 'summary_large_image',
        title: social.title,
        description: social.description,
        ...(socialImageList === undefined
          ? {}
          : { images: socialImageList }),
      },
      robots: articleNoIndex(article)
        ? { index: false, follow: false }
        : { index: true, follow: true },
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

  // Sidebar, "More on" rails and series navigation are decorative: a
  // failure here must never turn an otherwise-healthy article into an
  // error page, so each read is isolated and degrades to "section hidden".
  const articleSeries = article.series;
  const [morePage, categoryPage, series] = await Promise.all([
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
    articleSeries !== undefined
      ? fetchSafely(() => getSeries(articleSeries.slug))
      : Promise.resolve(null),
  ]);

  // Prev/next within the follow-up series, by series position.
  const seriesIndex =
    series?.articles.findIndex((item) => item.slug === article.slug) ?? -1;
  const seriesPrev =
    seriesIndex > 0 ? series?.articles[seriesIndex - 1] : undefined;
  const seriesNext =
    seriesIndex >= 0 && series !== null && seriesIndex < series.articles.length - 1
      ? series.articles[seriesIndex + 1]
      : undefined;

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

  // "Read next" recirculation: injected into the flow directly after
  // the lede paragraph, where a reader who has just committed is most
  // receptive to the next story. Falls back to the end of the article
  // when the body opens with something other than a paragraph.
  const firstParagraphIndex = article.body.findIndex(
    (block, index) => index !== heroBlockIndex && block.type === 'paragraph',
  );
  const inlineTeaser =
    readNext.length > 0 && firstParagraphIndex >= 0
      ? {
          index: firstParagraphIndex,
          node: <InlineReadNext items={readNext.slice(0, 2)} />,
        }
      : undefined;

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

      {article.series !== undefined ? (
        <SeriesNav
          series={article.series}
          prev={seriesPrev}
          next={seriesNext}
        />
      ) : null}

      <article>
        {article.corrections.length > 0 ? (
          <aside
            aria-label="Corrections"
            className="mb-8 rounded-xl border-l-4 border-gold bg-gold/10 px-4 py-3 text-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
              {article.corrections.length === 1 ? 'Correction' : 'Corrections'}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {article.corrections.map((correction) => (
                <li key={`${correction.date}-${correction.note}`}>
                  <time dateTime={correction.date} className="font-semibold text-ink">
                    {formatDate(correction.date)}
                  </time>
                  <span className="text-ink/85"> — {correction.note}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <header className="mb-8">
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

          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl">
            {article.title}
          </h1>

          {article.subtitle !== undefined ? (
            <p className="mt-4 max-w-2xl font-serif text-xl italic leading-relaxed text-muted">
              {article.subtitle}
            </p>
          ) : null}

          {article.excerpt !== undefined ? (
            <p
              className={`max-w-2xl text-lg leading-relaxed text-muted ${
                article.subtitle !== undefined ? 'mt-3' : 'mt-4'
              }`}
            >
              {article.excerpt}
            </p>
          ) : null}

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {article.author.imageUrl !== undefined ? (
              <SmartImage
                src={article.author.imageUrl}
                alt=""
                width={36}
                height={36}
                className="mr-1 h-9 w-9 rounded-full object-cover"
              />
            ) : null}
            {article.publishedAt !== '' ? (
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
            ) : null}
            {article.author.name !== '' ? (
              <>
                <span aria-hidden="true" className="text-gold">
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
            {article.readingTimeMinutes !== undefined ? (
              <>
                <span aria-hidden="true" className="text-gold">
                  ·
                </span>
                <span>{article.readingTimeMinutes} min read</span>
              </>
            ) : null}
            {articleHasUpdate(article) ? (
              <>
                <span aria-hidden="true" className="text-gold">
                  ·
                </span>
                <span>
                  Updated{' '}
                  <time dateTime={article.modifiedAt}>
                    {formatDate(article.modifiedAt as string)}
                  </time>
                </span>
              </>
            ) : null}
          </p>
        </header>

        {heroImage !== undefined ? (
          <figure className="mb-10">
            {/* Editor-chosen CDN image; not available to next/image at
                build time. Explicit dims keep CLS at zero. SmartImage
                falls back to a local placeholder if the CDN fails. */}
            <SmartImage
              src={heroImage.url}
              alt={heroImage.alt}
              width={heroImage.width}
              height={heroImage.height}
              className="aspect-[16/9] w-full rounded-2xl object-cover"
            />
            {heroImage.caption !== undefined ||
            heroImage.credit !== undefined ||
            heroImage.alt !== '' ? (
              <figcaption className="mt-2 text-center text-xs text-muted">
                {heroImage.caption ?? heroImage.alt}
                {heroImage.credit !== undefined ? (
                  <span className="text-muted/70">
                    {' '}
                    · Photo: {heroImage.credit}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

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
          insertAfter={inlineTeaser}
        />

        {article.author.name !== '' ? (
          <aside
            aria-label={`About ${article.author.name}`}
            className="mt-12 flex gap-4 rounded-2xl border border-line bg-card p-5"
          >
            {article.author.imageUrl !== undefined ? (
              <SmartImage
                src={article.author.imageUrl}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <BrandMark className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Written by
              </p>
              <p className="mt-0.5 font-semibold">{article.author.name}</p>
              {article.author.bio !== undefined ? (
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {article.author.bio}
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}

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

          {inlineTeaser === undefined && readNext.length > 0 ? (
            <section aria-labelledby="read-next-heading" className="mt-10">
              <h2
                id="read-next-heading"
                className="font-serif text-2xl font-black tracking-tight"
              >
                Read next
              </h2>
              <ol className="mt-4 border-t border-line">
                {readNext.map((item, index) => (
                  <li
                    key={item.id}
                    className="group flex items-center gap-4 border-b border-line py-4"
                  >
                    <span
                      aria-hidden="true"
                      className="w-7 shrink-0 font-serif text-2xl font-bold italic leading-none text-gold/60 transition-colors group-hover:text-gold"
                    >
                      {index + 1}
                    </span>
                    <Link
                      href={articlePath(item.slug)}
                      className="story-link font-serif text-lg font-semibold leading-snug tracking-tight"
                    >
                      {item.title}
                    </Link>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="ml-auto h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </li>
                ))}
              </ol>
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
 * Mid-article "Read next" card: a compact recirculation box injected
 * after the lede paragraph. At most two stories — a tap away from the
 * next piece without leaving the flow.
 */
function InlineReadNext({ items }: { items: ArticleView[] }) {
  return (
    <aside
      aria-label="Read next"
      className="my-8 rounded-2xl border border-gold/40 bg-card p-5"
    >
      <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        Read next
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </p>
      <ul className="mt-3 space-y-3.5">
        {items.map((item) => {
          const category = item.categories[0];
          return (
            <li key={item.id} className="group flex items-center gap-3">
              <span className="min-w-0 flex-1">
                {category !== undefined ? (
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                    {category.name}
                  </span>
                ) : null}
                <Link
                  href={articlePath(item.slug)}
                  className="story-link font-serif text-base font-semibold leading-snug tracking-tight"
                >
                  {item.title}
                </Link>
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-1"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </li>
          );
        })}
      </ul>
    </aside>
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
 * Follow-up series navigation: a dark banner naming the series, this
 * article's place in it, and prev/next links. A missing neighbour (or a
 * series fetch that failed upstream) degrades to an inert label — the
 * banner never blocks the article.
 */
function SeriesNav({
  series,
  prev,
  next,
}: {
  series: SeriesView;
  prev?: ArticleView;
  next?: ArticleView;
}) {
  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors';
  return (
    <nav
      aria-label={`Series: ${series.name}`}
      className="relative mb-8 overflow-hidden rounded-2xl bg-night p-5"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-gold to-accent"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            Series · Part {series.position} of {series.total}
          </p>
          <p className="mt-1 truncate font-serif text-xl font-semibold tracking-tight text-white">
            {series.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {prev !== undefined ? (
            <Link
              href={articlePath(prev.slug)}
              className={`${pill} text-white hover:border-gold hover:text-gold`}
            >
              ← Previous
            </Link>
          ) : (
            <span className={`${pill} cursor-default text-white/35`}>
              ← Previous
            </span>
          )}
          {next !== undefined ? (
            <Link
              href={articlePath(next.slug)}
              className={`${pill} border-accent bg-accent text-white hover:border-accent-deep hover:bg-accent-deep`}
            >
              Next →
            </Link>
          ) : (
            <span className={`${pill} cursor-default text-white/35`}>
              Next →
            </span>
          )}
        </div>
      </div>
    </nav>
  );
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
