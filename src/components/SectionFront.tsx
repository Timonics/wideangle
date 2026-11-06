import Link from 'next/link';
import type { ArticleView } from '@/lib/types';
import type { TaxonomyView } from '@/lib/types';
import { articlePath, categoryPath } from '@/lib/urls';
import { formatRelativeTime } from '@/lib/seo';
import { SectionLabel } from '@/components/SectionLabel';
import SmartImage from '@/components/SmartImage';

/**
 * A category section front — the Business Insider vertical pattern: an
 * image-led story on the left, a column of headline rows on the right,
 * a "More in {category}" escape hatch in the header. Both the lead
 * headline and each row headline are single links.
 */
export function SectionFront({
  id,
  category,
  lead,
  items,
}: {
  id: string;
  category: TaxonomyView;
  lead: ArticleView;
  items: ArticleView[];
}) {
  return (
    <section aria-labelledby={id} className="mt-16 sm:mt-20">
      <SectionLabel
        id={id}
        action={{
          href: categoryPath(category.slug),
          label: `More in ${category.name}`,
        }}
      >
        {category.name}
      </SectionLabel>

      <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* Lead story */}
        <article className="group">
          {lead.heroImage !== undefined ? (
            <Link
              href={articlePath(lead.slug)}
              aria-hidden="true"
              tabIndex={-1}
              className="block overflow-hidden rounded-2xl"
            >
              <SmartImage
                src={lead.heroImage.url}
                alt={lead.heroImage.alt}
                width={lead.heroImage.width}
                height={lead.heroImage.height}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </Link>
          ) : null}
          <h3 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            <Link href={articlePath(lead.slug)} className="story-link">
              {lead.title}
            </Link>
          </h3>
          {lead.excerpt !== undefined ? (
            <p className="mt-2 line-clamp-3 leading-relaxed text-muted">
              {lead.excerpt}
            </p>
          ) : null}
          <StoryMeta article={lead} />
        </article>

        {/* Headline column */}
        {items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line border-y border-line lg:border-y-0 lg:border-t">
            {items.map((article) => (
              <li key={article.id} className="group py-5 first:pt-0 lg:first:pt-5">
                <h4 className="mt-1 font-serif text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                  <Link href={articlePath(article.slug)} className="story-link">
                    {article.title}
                  </Link>
                </h4>
                {article.excerpt !== undefined ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    {article.excerpt}
                  </p>
                ) : null}
                <StoryMeta article={article} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function StoryMeta({ article }: { article: ArticleView }) {
  const bits: string[] = [];
  if (article.author.name !== '') {
    bits.push(article.author.name);
  }
  if (article.publishedAt !== '') {
    bits.push(formatRelativeTime(article.publishedAt));
  }
  if (bits.length === 0) {
    return null;
  }
  return <p className="mt-2 text-xs font-medium text-muted">{bits.join(' · ')}</p>;
}
