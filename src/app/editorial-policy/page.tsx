import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getAuthors } from '@/lib/data';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: { absolute: 'Editorial Policy | WideAngle' },
    description:
      'WideAngle’s standards for authorship, sources, firsthand experience, AI-assisted drafting, corrections, and commercial disclosures.',
    alternates: { canonical: '/editorial-policy' },
  };
}

export default async function EditorialPolicyPage() {
  const { publication } = getConfig();
  const authors = await getAuthors();
  const writerName = authors[0]?.name ?? 'the founding writer';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
        How {publication.name} works
      </h1>

      <div className="prose-wideangle mt-6">
        <p>
          Readers should be able to understand not only what an article
          says, but why they should trust its explanation.
        </p>
        <p>
          This policy describes {publication.name}&apos;s approach to
          authorship, research, AI assistance, corrections, and commercial
          relationships. It applies to the publication as it grows,
          including work from future contributors.
        </p>

        <h2>Authorship and responsibility</h2>
        <p>
          Articles identify the writer responsible for them. Author
          information should describe that person&apos;s role, relevant
          interests, and experience accurately.
        </p>
        <p>
          {publication.name} currently has one writer and editor:{' '}
          <strong className="font-semibold">{writerName}</strong>.
          Additional contributors may join in the future. A
          contributor&apos;s involvement will be identified through the
          article&apos;s byline rather than presented as anonymous
          expertise.
        </p>
        <p>
          We do not invent qualifications, imply professional review that
          did not take place, or attribute an article to a person who was
          not responsible for it.
        </p>

        <h2>Selecting and developing articles</h2>
        <p>
          Articles should answer a real question or provide a useful
          explanation. A subject being popular is not sufficient reason to
          publish an article that adds nothing meaningful.
        </p>
        <p>
          Before drafting, the scope should be clear: what the reader needs
          to understand, what evidence is available, and which questions
          fall outside the article.
        </p>
        <p>
          Explanations should get to the point without avoiding necessary
          qualifications. Length, headings, examples, and illustrations
          should serve the subject rather than follow an arbitrary formula.
        </p>

        <h2>Research and sources</h2>
        <p>
          Sources are selected according to the claim being made. Official
          documentation can establish what a product supports; a published
          rulebook can establish a rule; direct testing can show what
          happened under stated conditions.
        </p>
        <p>
          Important factual claims should be traceable to relevant evidence.
          Sources should be checked rather than included merely to make a
          page look well researched.
        </p>
        <p>
          Where sources disagree, the article should explain the
          disagreement when it matters. Unconfirmed reports, assumptions,
          and interpretations should not be presented as established facts.
        </p>
        <p>
          Quotations must preserve the speaker&apos;s meaning and identify
          their source. Statistics should include enough context to avoid
          misleading comparisons.
        </p>

        <h2>Firsthand experience</h2>
        <p>
          An article should say when its conclusions are based on firsthand
          use or testing.
        </p>
        <p>
          Relevant conditions — such as software version, device, platform,
          location, date, or ruleset — should be identified when they affect
          the result.
        </p>
        <p>
          We do not describe an item as tested because someone else tested
          it, or imply that an illustration proves something it does not.
        </p>

        <h2>AI assistance</h2>
        <p>
          {publication.name} uses AI tools to assist with research,
          outlines, drafting, and editing. Some articles begin as
          AI-generated drafts.
        </p>
        <p>
          These drafts are reviewed before publication. Material factual
          claims, references, quotations, and calculations require checking
          against appropriate evidence. AI output is not itself a source.
        </p>
        <p>
          Generated text must not create nonexistent studies, invented
          experience, unsupported product claims, or false quotations.
          Where a point cannot be established, it should be qualified,
          investigated further, or removed.
        </p>
        <p>
          The named writer and editor remain responsible for the published
          article.
        </p>

        <h2>Updates and corrections</h2>
        <p>
          Information can change, and errors can occur despite review.
        </p>
        <p>
          Material errors should be corrected with a note explaining the
          substantive change. Minor spelling, punctuation, or formatting
          adjustments may be made without a separate notice.
        </p>
        <p>
          An updated date should reflect a meaningful revision. It should
          not be changed simply to make an old article appear new.
        </p>
        <p>
          Readers can report an issue through the{' '}
          <a href="/contact">contact page</a>. Reports should be assessed on
          their evidence, regardless of whether they support or challenge
          the article&apos;s original conclusion.
        </p>

        <h2>Commercial relationships</h2>
        <p>
          Sponsorships, affiliate relationships, and supplied products must
          be disclosed where relevant.
        </p>
        <p>
          Commercial involvement does not justify unsupported praise or the
          omission of a material limitation. A recommendation should
          explain its basis, scope, and relevant alternatives.
        </p>
        <p>
          Advertising should be distinguishable from editorial content. If{' '}
          {publication.name} introduces a new commercial format, its
          presentation should make the relationship understandable to
          readers.
        </p>

        <h2>Scope and limitations</h2>
        <p>
          Articles provide general information. They are not a substitute
          for individual professional advice where a decision requires it.
        </p>
        <p>
          Subjects involving health, safety, law, or financial consequences
          require particular care. If the publication cannot verify a claim
          or obtain the review needed to cover it responsibly, that is a
          reason to narrow or postpone the article.
        </p>
      </div>
    </div>
  );
}
