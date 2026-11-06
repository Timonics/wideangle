import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath } from '@/lib/urls';

/**
 * The scrolling headline ticker under the lead story — the
 * newsroom-style band of rotating titles. Pure CSS animation (two
 * identical halves panning -50%), pausing on hover and keyboard
 * focus, and static when the reader prefers reduced motion. The
 * duplicate half is aria-hidden so screen readers hear each story
 * once.
 */
export function HeadlineTicker({ articles }: { articles: ArticleView[] }) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center overflow-hidden border-y border-night bg-night py-3">
      <span className="z-10 shrink-0 bg-gold px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-night">
        Just published
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max motion-safe:animate-marquee">
          {[false, true].map((duplicate) => (
            <div
              key={duplicate ? 'dup' : 'first'}
              aria-hidden={duplicate}
              className="flex items-center"
            >
              {articles.map((article) => (
                <span
                  key={`${duplicate ? 'b' : 'a'}-${article.id}`}
                  className="flex shrink-0 items-center gap-3 px-6"
                >
                  <TickerMark />
                  <Link
                    href={articlePath(article.slug)}
                    tabIndex={duplicate ? -1 : 0}
                    className="whitespace-nowrap text-sm font-medium text-white/80 transition-colors hover:text-gold"
                  >
                    {article.title}
                  </Link>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TickerMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-2.5 w-2.5 shrink-0 text-gold"
    >
      <circle cx="16" cy="16" r="6" fill="currentColor" stroke="none" />
    </svg>
  );
}
