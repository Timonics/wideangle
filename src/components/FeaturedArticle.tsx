import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatDate } from '@/lib/seo';

/**
 * The featured hero card for the homepage: a large rounded image card
 * with the title overlaid on a gradient, magazine style.
 *
 * The image is a plain img (arbitrary editor-chosen CDN, not known at
 * build time — see ArticleBody). The whole heading is a single link, so
 * there is one tab stop and one link announcement.
 */
export function FeaturedArticle({ article }: { article: ArticleView }) {
  const primaryCategory = article.categories[0];
  const image = article.heroImage;

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-accent-deep">
      {image !== undefined ? (
        /* Editor-chosen CDN image; not available to next/image at
           build time. Explicit dims keep CLS at zero. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
        />
      ) : (
        <div className="aspect-[16/9] w-full sm:aspect-[21/9]" aria-hidden="true" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {primaryCategory !== undefined ? (
            <Link
              href={categoryPath(primaryCategory.slug)}
              className="rounded-full bg-white/15 px-3 py-1 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              {primaryCategory.name}
            </Link>
          ) : null}
          {article.publishedAt !== '' ? (
            <time
              dateTime={article.publishedAt}
              className="text-white/75"
            >
              {formatDate(article.publishedAt)}
            </time>
          ) : null}
        </div>

        <h2 className="mt-3 max-w-2xl font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          <Link
            href={articlePath(article.slug)}
            className="text-white underline decoration-transparent underline-offset-4 transition-colors hover:decoration-white"
          >
            {article.title}
          </Link>
        </h2>

        {article.excerpt !== undefined ? (
          <p className="mt-2 hidden max-w-xl text-sm text-white/85 sm:block">
            {article.excerpt}
          </p>
        ) : null}

        {article.author.name !== '' ? (
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-white/70">
            {article.author.name}
          </p>
        ) : null}
      </div>

      <Link
        href={articlePath(article.slug)}
        aria-hidden="true"
        tabIndex={-1}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </Link>
    </article>
  );
}
