import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategories } from '@/lib/data';
import { articlePath } from '@/lib/urls';
import { ArticleCard } from '@/components/ArticleCard';
import { FeaturedArticle } from '@/components/FeaturedArticle';
import { HeadlineTicker } from '@/components/HeadlineTicker';
import { TrendingBand } from '@/components/TrendingBand';
import { EditorsPicks } from '@/components/EditorsPicks';
import { SectionFront } from '@/components/SectionFront';
import { SectionLabel } from '@/components/SectionLabel';
import { EmptyState } from '@/components/EmptyState';
import { BrandMark } from '@/components/Logo';

export const revalidate = 300;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    // `absolute` prevents the root layout's title template from
    // appending the publication name a second time.
    title: { absolute: publication.name },
    description: publication.description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      title: publication.name,
      description: publication.description,
      url: publication.canonicalOrigin,
    },
  };
}

/**
 * The front page — a magazine front page in the Billboard / Business
 * Insider mould, built for rhythm: every section looks and behaves
 * differently so the page reads as a curated edition, not a feed.
 *
 *   1. Lead — the featured story (editor-picked, else newest) as a
 *      full-width "Top Story" image with oversized serif type.
 *   2. Just In — the next four stories as compact image cards.
 *   3. Trending — a dark numbered band with ghost numerals.
 *   4. Section fronts — the first categories, each an image-led lead
 *      beside a column of headlines.
 *   5. A closing band inviting readers to follow the feed.
 *
 * There is no marketing copy here — the About page carries the
 * publication's story.
 */
export default async function HomePage() {
  const { publication } = getConfig();

  const [page, categories] = await Promise.all([
    getArticlePage({ page: 1, pageSize: 13 }),
    getCategories(),
  ]);
  const articles = page.items;

  if (articles.length === 0) {
    return (
      <EmptyState
        title="No stories yet"
        action={{ href: '/articles', label: 'Browse the archive' }}
      >
        The first story will take pride of place here as soon as it is
        published.
      </EmptyState>
    );
  }

  const lead = articles.find((item) => item.featured) ?? articles[0];
  const rest = articles.filter((item) => item.id !== lead.id);
  const justIn = rest.slice(0, 4);
  const trending = rest.slice(4, 9);
  const picks = rest.slice(9, 12);

  // Stories already on the page, so the section fronts below surface
  // something new rather than repeating the lead.
  const shownIds = new Set(
    [lead, ...justIn, ...trending, ...picks].map((article) => article.id),
  );

  // Section fronts run concurrently; each takes the newest unseen
  // stories from one category (a lead plus up to three headlines).
  const fronts = await Promise.all(
    categories.slice(0, 3).map(async (category) => ({
      category,
      unseen: (
        await getArticlePage({ page: 1, pageSize: 8, categoryId: category.id })
      ).items.filter((article) => !shownIds.has(article.id)),
    })),
  );
  const sections = fronts.filter((front) => front.unseen.length > 0);

  return (
    <>
      {/* Dateline — the front page is an edition, not a feed. The date
          truncates rather than crowds the label on narrow screens. */}
      <div className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted sm:mb-8 sm:gap-4">
        <time
          dateTime={new Date().toISOString().slice(0, 10)}
          className="min-w-0 truncate text-gold"
        >
          {new Date().toLocaleDateString(publication.locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <span className="shrink-0">Latest edition</span>
      </div>

      {/* Lead — the "Top Story". */}
      <FeaturedArticle article={lead} />

      {/* Headline ticker — the rolling index of what just landed. */}
      <div className="mt-6 sm:mt-8">
        <HeadlineTicker articles={rest.slice(0, 6)} />
      </div>

      {rest.length === 0 ? (
        <div className="mt-16">
          <EmptyState title="More stories are on the way">
            The archive is just getting started. The first story is above;
            the rest will follow here.
          </EmptyState>
        </div>
      ) : null}

      {/* Just In — the next four stories, compact image cards. */}
      {justIn.length > 0 ? (
        <section aria-labelledby="just-in-heading" className="mt-16 sm:mt-20">
          <SectionLabel
            id="just-in-heading"
            action={
              page.hasNext
                ? { href: '/articles', label: 'All stories' }
                : undefined
            }
          >
            Just In
          </SectionLabel>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {justIn.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} headingLevel={3} image />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Trending — the dark numbered band. */}
      {trending.length > 0 ? (
        <TrendingBand id="trending-heading" articles={trending} />
      ) : null}

      {/* The Big Read — one story given room, beside compact rows. */}
      {picks.length > 0 ? (
        <EditorsPicks
          id="picks-heading"
          lead={picks[0]}
          items={picks.slice(1, 3)}
          hasMore={page.hasNext}
        />
      ) : null}

      {/* Section fronts — one per category, lead + headline column. */}
      {sections.map(({ category, unseen }) => (
        <SectionFront
          key={category.id}
          id={`front-${category.id}`}
          category={category}
          lead={unseen[0]}
          items={unseen.slice(1, 4)}
        />
      ))}

      {/* Closing band — a pull-quote from the lead story over the
          follow invitation. */}
      <section
        aria-labelledby="follow-heading"
        className="relative mt-20 overflow-hidden rounded-3xl bg-night px-6 py-14 text-center sm:px-12 sm:py-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-gold to-accent"
        />
        <BrandMark
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-8 h-52 w-52 rotate-12 text-white/[0.05]"
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold">
            {lead.excerpt !== undefined ? 'From the lead story' : 'Stay in the loop'}
          </p>
          {lead.excerpt !== undefined ? (
            <>
              <h2
                id="follow-heading"
                className="mx-auto mt-4 line-clamp-4 max-w-4xl font-serif text-3xl font-medium italic leading-tight tracking-tight text-white sm:line-clamp-6 sm:text-5xl"
              >
                “{lead.excerpt}”
              </h2>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-white/50">
                <Link
                  href={articlePath(lead.slug)}
                  className="text-gold transition-colors hover:text-white"
                >
                  Read the full story
                </Link>
                {lead.author.name !== '' ? ` · ${lead.author.name}` : ''}
              </p>
            </>
          ) : (
            <>
              <h2
                id="follow-heading"
                className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl"
              >
                There’s more to the{' '}
                <em className="italic text-gold">question.</em>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
                Follow {publication.name} and every new story lands in
                your reader the moment it is published — no account, no
                noise.
              </p>
            </>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-night shadow-lg shadow-gold/25 transition-all hover:bg-gold-deep hover:shadow-gold/40"
            >
              <RssIcon />
              Subscribe to the feed
            </a>
            <Link
              href="/about"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white/85 transition-colors hover:border-gold hover:text-gold"
            >
              About {publication.name}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function RssIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
