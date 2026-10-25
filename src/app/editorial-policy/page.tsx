import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { publication } = getConfig();
  return {
    title: 'Editorial policy',
    description: `How articles in ${publication.name} are written, sourced and corrected.`,
    alternates: { canonical: '/editorial-policy' },
  };
}

export default function EditorialPolicyPage() {
  const { publication } = getConfig();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Editorial policy</h1>

      <div className="prose-wideangle mt-6">
        <h2>Authorship</h2>
        <p>
          {publication.name} is a single-author publication. Every article is
          written, edited and published by one person. There are no guest
          posts and no anonymous contributions.
        </p>

        <h2>Sourcing</h2>
        <p>
          Articles are written from first-hand experience — work done, systems
          built, failures debugged — and from reading primary sources such as
          documentation and specifications. Where an article states a fact
          about someone else&apos;s system, that fact is either taken from a
          primary source or explicitly marked as unverified.
        </p>
        <p>
          Articles do not report on breaking news, and they do not reproduce
          other people&apos;s reporting.
        </p>

        <h2>Corrections</h2>
        <p>
          Errors are corrected by editing the article itself. The original
          publication date is preserved; where a correction is significant
          enough that a reader could be misled, the article records that it
          was updated.
        </p>

        <h2>AI assistance</h2>
        <p>
          Drafting tools may be used for grammar, structure or for working
          through a technical problem. The reasoning, the claims and the
          final wording are the author&apos;s own, and the author is
          accountable for every article.
        </p>
        <p>
          No article is published by an automated system on its own, and no
          article is generated in bulk.
        </p>

        <h2>Independence</h2>
        <p>
          {publication.name} carries no advertising and has no commercial
          sponsors. Nothing on this site is a paid placement.
        </p>
      </div>
    </>
  );
}
