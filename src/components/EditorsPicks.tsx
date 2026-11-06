import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatRelativeTime } from '@/lib/seo';
import { SectionLabel } from '@/components/SectionLabel';
import SmartImage from '@/components/SmartImage';
import { BrandMark } from '@/components/Logo';

/**
 * "The Big Read" — the People.com hero pattern: one image-led story
 * given room to breathe on the left, a column of compact thumbnail
 * rows on the right. Degrades gracefully: one article renders the
 * lead alone, two add a single row.
 */
export function EditorsPicks({
  id,
  lead,
  items,
  hasMore = false,
}: {
  id: string;
  lead: ArticleView;
  items: ArticleView[];
  hasMore?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="mt-16 sm:mt-20">
      <SectionLabel
        id={id}
        action={hasMore ? { href: '/articles', label: 'All stories' } : undefined}
      >
        The Big Read
      </SectionLabel>

      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Lead story */}
        <article className="group">
          <Link
            href={articlePath(lead.slug)}
            aria-hidden="true"
            tabIndex={-1}
            className="block overflow-hidden rounded-2xl"
          >
            {lead.heroImage !== undefined ? (
              <SmartImage
                src={lead.heroImage.url}
                alt={lead.heroImage.alt}
                width={lead.heroImage.width}
                height={lead.heroImage.height}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="flex aspect-[4/3] w-full items-center justify-center bg-surface text-accent">
                <BrandMark className="h-10 w-10" />
              </span>
            )}
          </Link>
          <div className="mt-4">
            <Kicker article={lead} />
          </div>
          <h3 className="mt-2 font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            <Link href={articlePath(lead.slug)} className="story-link">
              {lead.title}
            </Link>
          </h3>
          {lead.excerpt !== undefined ? (
            <p className="mt-3 line-clamp-3 leading-relaxed text-muted">
              {lead.excerpt}
            </p>
          ) : null}
          <Byline article={lead} />
        </article>

        {/* Stacked rows */}
        {items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line border-y border-line lg:border-y-0 lg:border-t">
            {items.map((article) => (
              <li key={article.id} className="group flex gap-4 py-6 first:pt-0 sm:gap-5 lg:first:pt-6">
                <Link
                  href={articlePath(article.slug)}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="block w-28 shrink-0 overflow-hidden rounded-xl sm:w-40"
                >
                  {article.heroImage !== undefined ? (
                    <SmartImage
                      src={article.heroImage.url}
                      alt={article.heroImage.alt}
                      width={article.heroImage.width}
                      height={article.heroImage.height}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center bg-surface text-accent">
                      <BrandMark className="h-6 w-6" />
                    </span>
                  )}
                </Link>
                <div className="min-w-0 self-center">
                  <Kicker article={article} />
                  <h4 className="mt-1.5 font-serif text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                    <Link href={articlePath(article.slug)} className="story-link">
                      {article.title}
                    </Link>
                  </h4>
                  <Byline article={article} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Kicker({ article }: { article: ArticleView }) {
  const category = article.categories[0];
  if (category === undefined) {
    return null;
  }
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
      <Link
        href={categoryPath(category.slug)}
        className="text-accent transition-colors hover:text-gold"
      >
        {category.name}
      </Link>
    </p>
  );
}

function Byline({ article }: { article: ArticleView }) {
  const bits: string[] = [];
  if (article.author.name !== '') {
    bits.push(article.author.name);
  }
  if (article.publishedAt !== '') {
    bits.push(formatRelativeTime(article.publishedAt));
  }
  if (article.readingTimeMinutes !== undefined) {
    bits.push(`${article.readingTimeMinutes} min read`);
  }
  if (bits.length === 0) {
    return null;
  }
  return <p className="mt-2 text-xs font-medium text-muted">{bits.join(' · ')}</p>;
}
