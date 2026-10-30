import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatDate } from '@/lib/seo';

/**
 * An article card.
 *
 * The whole card is a single link, so there is exactly one tab stop
 * and one link announcement per card. The date and category are
 * rendered as text inside that link rather than as sibling links —
 * nested links are invalid HTML.
 *
 * With `image`, a hero thumbnail is shown above the text. The image
 * sits in a second, decorative link (aria-hidden, tabIndex -1) so the
 * card keeps exactly one meaningful tab stop.
 */
export function ArticleCard({
  article,
  headingLevel = 2,
  image = false,
}: {
  article: ArticleView;
  headingLevel?: 2 | 3;
  image?: boolean;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const primaryCategory = article.categories[0];
  const showImage = image && article.heroImage !== undefined;

  return (
    <article className="group">
      {showImage && article.heroImage !== undefined ? (
        <Link
          href={articlePath(article.slug)}
          aria-hidden="true"
          tabIndex={-1}
          className="block overflow-hidden rounded-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element --
              Editor-chosen CDN image; not available to next/image at
              build time. Explicit dims keep CLS at zero. */}
          <img
            src={article.heroImage.url}
            alt={article.heroImage.alt}
            width={article.heroImage.width}
            height={article.heroImage.height}
            loading="lazy"
            decoding="async"
            className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      ) : null}

      {primaryCategory !== undefined ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">
          <Link
            href={categoryPath(primaryCategory.slug)}
            className="text-accent transition-colors hover:text-accent-deep"
          >
            {primaryCategory.name}
          </Link>
        </p>
      ) : null}

      <Heading className="mt-1.5 font-serif text-xl font-semibold leading-snug tracking-tight">
        <Link
          href={articlePath(article.slug)}
          className="underline decoration-transparent underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          {article.title}
        </Link>
      </Heading>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {article.publishedAt !== '' ? (
          <time dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
        ) : null}
        {article.author.name !== '' ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{article.author.name}</span>
          </>
        ) : null}
      </p>

      {article.excerpt !== undefined ? (
        <p className="mt-2 line-clamp-3 text-ink/80">{article.excerpt}</p>
      ) : null}

      {article.categories.length > 1 || article.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {article.categories.slice(1).map((category) => (
            <li key={category.id}>
              <Link
                href={categoryPath(category.slug)}
                className="rounded-full border border-line px-2 py-0.5 transition-colors hover:border-accent hover:text-accent"
              >
                {category.name}
              </Link>
            </li>
          ))}
          {article.tags.map((tag) => (
            <li
              key={tag.id}
              className="rounded-full bg-surface px-2 py-0.5 text-muted"
            >
              {tag.name}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
