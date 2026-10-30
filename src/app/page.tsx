import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getArticlePage, getCategories } from '@/lib/data';
import { articlePath, categoryPath } from '@/lib/urls';
import { comingUpItems } from '@/lib/coming-up';
import { ArticleCard } from '@/components/ArticleCard';
import { FeaturedArticle } from '@/components/FeaturedArticle';
import { SectionLabel } from '@/components/SectionLabel';
import { EmptyState } from '@/components/EmptyState';

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

export default async function HomePage() {
  const { publication } = getConfig();

  // Both reads are independent — fetch them concurrently rather than
  // serialising the latency.
  const [articles, categories] = await Promise.all([
    getArticlePage({ page: 1, pageSize: 10 }),
    getCategories(),
  ]);

  const [featured, ...latest] = articles.items;

  // Topics group the latest stories by shared tags, so readers can
  // follow a thread across articles.
  const topics = buildTopics(articles.items).slice(0, 6);

  return (
    <>
      {/* Hero — the newest story, magazine style. */}
      <section className="mb-16">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {publication.name}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Best of the week
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              {publication.description}
            </p>
          </div>
          <Link
            href="/articles"
            className="rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            See all posts →
          </Link>
        </div>

        {featured !== undefined ? (
          <FeaturedArticle article={featured} />
        ) : (
          <EmptyState title="No stories yet">
            The archive is ready — the first story will take pride of place
            right here.
          </EmptyState>
        )}
      </section>

      {/* Categories — browse the archive by subject. */}
      <section aria-labelledby="categories-heading" className="mb-16">
        <SectionLabel id="categories-heading">Categories</SectionLabel>
        {categories.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No categories yet">
              Categories group the archive by subject. They appear here once
              they are created in Calliope.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={categoryPath(category.slug)}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-line bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl hover:shadow-accent/10"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 -top-6 select-none font-serif text-[7rem] font-bold leading-none text-accent/10 transition-colors duration-300 group-hover:text-accent/20"
                  >
                    {category.name.charAt(0).toUpperCase()}
                  </span>
                  <h3 className="relative font-serif text-xl font-semibold tracking-tight transition-colors group-hover:text-accent">
                    {category.name}
                  </h3>
                  {category.description !== undefined ? (
                    <p className="relative mt-1.5 line-clamp-2 text-sm text-muted">
                      {category.description}
                    </p>
                  ) : null}
                  <p className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-accent">
                    Browse
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coming up — curated teasers for what's next. */}
      <section aria-labelledby="coming-up-heading" className="mb-16">
        <SectionLabel id="coming-up-heading">Coming up</SectionLabel>
        {comingUpItems.length === 0 ? (
          <EmptyState title="Nothing scheduled">
            Coming-up teasers are curated by hand — check back soon for
            what&apos;s next.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {comingUpItems.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-8"
              >
                {item.date !== undefined ? (
                  <p className="w-36 shrink-0 text-sm font-semibold uppercase tracking-wide text-accent">
                    {item.date}
                  </p>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                  {item.description !== undefined ? (
                    <p className="mt-0.5 text-sm text-muted">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {item.href !== undefined ? (
                  <Link
                    href={item.href}
                    className="shrink-0 text-sm font-semibold text-accent underline decoration-accent/45 underline-offset-4 transition-colors hover:decoration-accent"
                  >
                    Details →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Topics — latest stories grouped by shared tags, on a dark band. */}
      <section aria-labelledby="topics-heading" className="mb-16">
        <SectionLabel id="topics-heading">Topics</SectionLabel>
        {topics.length === 0 ? (
          <EmptyState title="No topics yet">
            Topics form when stories share tags. Publish a few stories with
            tags and the conversations will collect here.
          </EmptyState>
        ) : (
          <div className="rounded-3xl bg-[#181626] p-5 dark:bg-[#1e1c33] sm:p-8">
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <li
                  key={topic.tag.id}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">
                      Topic
                    </p>
                    <p className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {topic.articles.length}{' '}
                      {topic.articles.length === 1 ? 'story' : 'stories'}
                    </p>
                  </div>
                  <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-white">
                    <span className="text-accent">#</span>
                    {topic.tag.name}
                  </h3>
                  <ul className="mt-3 flex-1 space-y-2.5 text-sm">
                    {topic.articles.map((article) => (
                      <li
                        key={article.id}
                        className="border-l-2 border-white/10 pl-3 transition-colors hover:border-accent"
                      >
                        <Link
                          href={articlePath(article.slug)}
                          className="text-white/70 underline decoration-transparent underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={articlePath(topic.articles[0].slug)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-accent"
                  >
                    Read the thread
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Latest stories — everything else, newest first. */}
      <section aria-labelledby="latest-heading">
        <SectionLabel
          id="latest-heading"
          action={
            articles.hasNext
              ? { href: '/articles', label: 'View all ↗' }
              : undefined
          }
        >
          Latest stories
        </SectionLabel>

        {latest.length === 0 ? (
          <EmptyState title="No stories yet">
            {featured === undefined
              ? 'Once the first story is published it will appear here.'
              : 'More stories are on the way.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
              <li
                key={article.id}
                className="rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl hover:shadow-accent/10"
              >
                <ArticleCard article={article} headingLevel={3} image />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * Group articles by their tags, keeping the tag's first-seen order and
 * at most three articles per topic.
 */
function buildTopics(
  articles: Awaited<ReturnType<typeof getArticlePage>>['items'],
) {
  const byTag = new Map<string, { tag: (typeof articles)[number]['tags'][number]; articles: typeof articles }>();
  for (const article of articles) {
    for (const tag of article.tags) {
      const entry = byTag.get(tag.id);
      if (entry === undefined) {
        byTag.set(tag.id, { tag, articles: [article] });
      } else if (entry.articles.length < 3) {
        entry.articles.push(article);
      }
    }
  }
  return [...byTag.values()];
}
