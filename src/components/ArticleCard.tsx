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
 */
export function ArticleCard({
  article,
  headingLevel = 2,
}: {
  article: ArticleView;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const primaryCategory = article.categories[0];

  return (
    <article className="group">
      <Heading className="text-lg font-semibold leading-snug">
        <Link href={articlePath(article.slug)} className="hover:underline">
          {article.title}
        </Link>
      </Heading>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
        {article.publishedAt !== '' ? (
          <time dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
        ) : null}
        {primaryCategory !== undefined ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{primaryCategory.name}</span>
          </>
        ) : null}
        {article.author.name !== '' ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{article.author.name}</span>
          </>
        ) : null}
      </p>

      {article.excerpt !== undefined ? (
        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
          {article.excerpt}
        </p>
      ) : null}

      {article.categories.length > 1 || article.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {article.categories.slice(1).map((category) => (
            <li key={category.id}>
              <Link
                href={categoryPath(category.slug)}
                className="rounded-full border border-neutral-300 px-2 py-0.5 hover:border-neutral-500 dark:border-neutral-700"
              >
                {category.name}
              </Link>
            </li>
          ))}
          {article.tags.map((tag) => (
            <li
              key={tag.id}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tag.name}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
