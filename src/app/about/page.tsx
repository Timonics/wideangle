import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig } from '@/lib/config';
import { getAuthors } from '@/lib/data';
import { pageJsonLd } from '@/lib/seo';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: { absolute: 'About WideAngle' },
    description:
      'Learn why WideAngle exists, meet its founding writer, and understand the approach behind its articles and explanations.',
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const { publication } = getConfig();
  const authors = await getAuthors();
  const author = authors[0];
  const writerName = author?.name ?? 'its founding writer';

  return (
    <div className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            pageJsonLd({
              name: 'About',
              description: `Learn why ${publication.name} exists, meet its founding writer, and understand the approach behind its articles.`,
              canonicalPath: '/about',
              breadcrumb: [
                { name: publication.name, path: '/' },
                { name: 'About', path: '/about' },
              ],
            }),
          ),
        }}
      />

      <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
        About {publication.name}
      </h1>

      <div className="prose-wideangle mt-6">
        <p>Some questions deserve more than a quick answer.</p>
        <p>
          You look something up because you want to understand it, make a
          decision, or solve a problem. Instead, you find an explanation that
          skips the important detail, assumes too much, or takes several
          paragraphs to say very little.
        </p>
        <p>
          {publication.name} was created to offer something more useful:
          writing that answers the question clearly, explains the reasoning,
          and makes room for the details that could change your
          understanding.
        </p>

        <h2>What we publish</h2>
        <p>
          {publication.name} is an independent publication built around
          practical questions and careful explanations.
        </p>
        <p>
          An article might explore how something works, distinguish between
          two commonly confused ideas, walk through a process, or examine
          what has actually been confirmed about a developing subject. The
          format follows the question. Some answers need a few well-chosen
          paragraphs; others need examples, comparisons, illustrations, or a
          closer look at the evidence.
        </p>
        <p>
          The aim is not to make every subject sound simple. It is to make
          the explanation understandable without leaving out what matters.
        </p>
        <p>
          Our coverage will develop over time. Rather than treating every
          subject as an excuse for another article, we want to build useful
          collections that readers can explore and return to.
        </p>

        <h2>The writer behind {publication.name}</h2>
        <p>
          {publication.name} was founded by{' '}
          <strong className="font-semibold">{writerName}</strong>, a writer
          and its current editor, based in Nigeria.
        </p>
        {author?.bio !== undefined ? (
          <p>{author.bio}</p>
        ) : (
          <p>
            I started the publication with an interest in the questions
            people ask when something does not quite make sense: a term used
            without explanation, two options that seem interchangeable, or
            instructions that tell you what to do without explaining what
            will happen.
          </p>
        )}
        <p>
          That curiosity shapes the writing here. I want readers to leave
          with a clearer understanding — not simply a sentence to repeat.
        </p>
        <p>
          At launch, I am responsible for the articles and their editorial
          review. As {publication.name} develops, I intend to bring in
          additional writers with relevant interests and experience. Their
          work will carry their own bylines, and the same expectations
          around sourcing, accuracy, and clear explanation will apply.
        </p>

        <h2>How the work is prepared</h2>
        <p>
          Articles begin with a question and a decision about what a useful
          answer needs to cover.
        </p>
        <p>
          Research may involve official documentation, published rules,
          original studies, established reporting, or direct observation and
          testing. The appropriate approach depends on the subject.
          Important sources should be linked where they support the
          explanation.
        </p>
        <p>
          AI tools are used in the research and drafting process. They are
          not treated as authorities, and their output is reviewed before
          publication. An article should distinguish between what has been
          personally tested, what is supported by other evidence, and what
          remains uncertain.
        </p>
        <p>
          More detail is available in the{' '}
          <Link href="/editorial-policy">editorial policy</Link>.
        </p>

        <h2>Questions and corrections</h2>
        <p>
          Publishing carries a responsibility to correct mistakes and
          respond to information that changes an answer.
        </p>
        <p>
          If you notice an error, an outdated detail, or an explanation that
          leaves something important unresolved, please{' '}
          <Link href="/contact">get in touch</Link>. Include the article link
          and, where possible, the evidence you think should be considered.
        </p>
      </div>
    </div>
  );
}
