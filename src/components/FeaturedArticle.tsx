import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatDate } from '@/lib/seo';
import SmartImage from '@/components/SmartImage';
import { BrandMark } from '@/components/Logo';

/**
 * The lead story on the front page — a split editorial hero: oversized
 * serif headline and standfirst on the left, a tall framed image on
 * the right. On mobile the image leads and the type stacks beneath
 * it. Its heading is the page's <h1> — the front page has no other
 * page-level heading.
 *
 * The image is a plain img (arbitrary editor-chosen CDN, not known at
 * build time) loaded eagerly because it is the LCP element. The
 * heading is a single link: one tab stop, one announcement.
 */
export function FeaturedArticle({ article }: { article: ArticleView }) {
  const primaryCategory = article.categories[0];
  const image = article.heroImage;

  return (
    <section
      aria-label="Top story"
      className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14"
    >
      {/* Type column */}
      <div className="order-2 lg:order-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-night">
            {article.featured ? 'Editor’s pick' : 'Top story'}
          </span>
          {primaryCategory !== undefined ? (
            <Link
              href={categoryPath(primaryCategory.slug)}
              className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-deep"
            >
              {primaryCategory.name}
            </Link>
          ) : null}
        </div>

        <h1 className="mt-4 break-words font-serif text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl xl:text-6xl">
          <Link href={articlePath(article.slug)} className="story-link">
            {article.title}
          </Link>
        </h1>

        {article.excerpt !== undefined ? (
          <p className="mt-4 line-clamp-3 max-w-xl text-lg leading-relaxed text-muted">
            {article.excerpt}
          </p>
        ) : null}

        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
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
                By <span className="font-medium text-ink">{article.author.name}</span>
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
        </p>

        <Link
          href={articlePath(article.slug)}
          className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold transition-colors hover:text-accent"
        >
          Read the story
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Image column — leads on mobile, right on desktop. */}
      <figure className="group relative order-1 lg:order-2">
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-3 translate-y-3 rounded-3xl border-2 border-gold/40"
        />
        {image !== undefined ? (
          <Link
            href={articlePath(article.slug)}
            aria-hidden="true"
            tabIndex={-1}
            className="relative block overflow-hidden rounded-3xl"
          >
            {/* Editor-chosen CDN image; not available to next/image at
                build time. Explicit dims keep CLS at zero. SmartImage
                falls back to a local placeholder if the CDN fails. */}
            <SmartImage
              src={image.url}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading="eager"
              decoding="async"
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] lg:aspect-[4/5]"
            />
          </Link>
        ) : (
          <div
            className="relative flex aspect-[16/10] w-full items-center justify-center rounded-3xl bg-night lg:aspect-[4/5]"
            aria-hidden="true"
          >
            <BrandMark className="h-16 w-16 text-white/10" />
          </div>
        )}
      </figure>
    </section>
  );
}
