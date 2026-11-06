import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatRelativeTime } from '@/lib/seo';
import { BrandMark } from '@/components/Logo';

/**
 * The dark "Trending" band on the front page — Billboard's chart-module
 * pattern: numbered rows with oversized ghost numerals on the plum
 * background, a kicker, a serif headline and a relative timestamp.
 * Each row is a single title link; numerals are decorative.
 */
export function TrendingBand({
  id,
  articles,
}: {
  id: string;
  articles: ArticleView[];
}) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={id} className="mt-16 sm:mt-20">
      <div className="relative overflow-hidden rounded-3xl bg-night p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-gold to-accent"
        />
        <BrandMark
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rotate-12 text-white/[0.04]"
        />

        <div className="relative flex items-baseline justify-between gap-4">
          <h2
            id={id}
            className="font-serif text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            Trending
          </h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            On readers’ minds
          </p>
        </div>

        <ol className="relative mt-6 divide-y divide-white/10">
          {articles.map((article, index) => {
            const category = article.categories[0];
            return (
              <li key={article.id} className="group flex items-baseline gap-4 py-5 sm:gap-8">
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 font-serif text-4xl font-black italic leading-none text-white/15 transition-colors duration-300 group-hover:text-gold sm:w-16 sm:text-6xl"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                    {category !== undefined ? (
                      <Link
                        href={categoryPath(category.slug)}
                        className="text-gold transition-colors hover:text-white"
                      >
                        {category.name}
                      </Link>
                    ) : null}
                    {article.publishedAt !== '' ? (
                      <span className="font-semibold normal-case tracking-normal text-white/40">
                        {formatRelativeTime(article.publishedAt)}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 font-serif text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
                    <Link
                      href={articlePath(article.slug)}
                      className="story-link hover:text-gold"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  {article.excerpt !== undefined ? (
                    <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-white/55 hidden sm:block">
                      {article.excerpt}
                    </p>
                  ) : null}
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="hidden h-5 w-5 shrink-0 self-center text-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 sm:block"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
