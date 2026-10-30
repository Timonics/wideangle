import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath } from '@/lib/urls';
import { formatDate } from '@/lib/seo';
import { ViewfinderMark } from '@/components/Logo';

/**
 * A compact sidebar rail of stories (thumbnail, category kicker,
 * title, date), used for "Related posts" and "More articles" on the
 * article page. Each row is a single title link plus a decorative,
 * focus-skipped thumbnail link, so there is one tab stop per story.
 */
export function StoryRail({
  id,
  title,
  articles,
}: {
  id: string;
  title: string;
  articles: ArticleView[];
}) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="font-serif text-xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <ul className="mt-4 space-y-5">
        {articles.map((article) => {
          const category = article.categories[0];
          return (
            <li key={article.id} className="flex gap-3">
              {article.heroImage !== undefined ? (
                <Link
                  href={articlePath(article.slug)}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element --
                      Editor-chosen CDN image; not available to
                      next/image at build time. */}
                  <img
                    src={article.heroImage.url}
                    alt=""
                    width={article.heroImage.width}
                    height={article.heroImage.height}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface text-accent"
                >
                  <ViewfinderMark className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                {category !== undefined ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                    {category.name}
                  </p>
                ) : null}
                <h3 className="mt-0.5 text-sm font-semibold leading-snug">
                  <Link
                    href={articlePath(article.slug)}
                    className="underline decoration-transparent underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {article.title}
                  </Link>
                </h3>
                {article.publishedAt !== '' ? (
                  <p className="mt-1 text-xs text-muted">
                    <time dateTime={article.publishedAt}>
                      {formatDate(article.publishedAt)}
                    </time>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
