/**
 * The article body renderer.
 *
 * This is a Server Component: it renders on the server and ships no
 * client JavaScript (PRD §15 "minimal client JavaScript"). Every
 * upstream string is emitted as a React text node, never as markup, so
 * no upstream content can execute a script (AC-11).
 */

import type { ReactNode } from 'react';
import type { ContentBlock } from '@/lib/types';
import {
  KNOWN_BLOCK_TYPES,
  readListItems,
  readPlainText,
  readTable,
  readText,
  safeUrl,
  unknownBlockPlaceholder,
} from '@/lib/render/safe';

/**
 * Render a list of content blocks.
 *
 * `headingId` maps a block index to the id assigned in the outline, so
 * the table of contents links resolve to the right heading.
 */
export function ArticleBody({
  blocks,
  headingIds,
}: {
  blocks: ContentBlock[];
  headingIds?: Map<number, string>;
}) {
  return (
    <div className="prose-wideangle">
      {blocks.map((block, index) => (
        <Block
          key={`${block.type}-${index}`}
          block={block}
          headingId={headingIds?.get(index)}
        />
      ))}
    </div>
  );
}

function Block({
  block,
  headingId,
}: {
  block: ContentBlock;
  headingId: string | undefined;
}) {
  switch (block.type) {
    case 'paragraph':
      return <Paragraph block={block} />;
    case 'heading':
      return <Heading block={block} headingId={headingId} />;
    case 'quote':
      return <Quote block={block} />;
    case 'list':
      return <ListBlock block={block} />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'callout':
      return <Callout block={block} />;
    case 'divider':
      return <hr />;
    default:
      if (!KNOWN_BLOCK_TYPES.has(block.type)) {
        return unknownBlockPlaceholder(block.type, `${block.type}-${headingId ?? ''}`);
      }
      return unknownBlockPlaceholder(block.type, block.type);
  }
}

function Paragraph({ block }: { block: ContentBlock }) {
  const text = readText(block.data, 'text');
  if (text === null) {
    return null;
  }
  return <p>{text}</p>;
}

function Heading({
  block,
  headingId,
}: {
  block: ContentBlock;
  headingId: string | undefined;
}) {
  const text = readText(block.data, 'text');
  if (text === null) {
    return null;
  }
  const level = normaliseLevel(block.data.level);
  const id = headingId;

  if (level === 2) {
    return (
      <h2 id={id} className="group">
        {text}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 id={id} className="group">
        {text}
      </h3>
    );
  }
  return (
    <h4 id={id} className="group">
      {text}
    </h4>
  );
}

function normaliseLevel(value: unknown): 2 | 3 | 4 {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return 2;
  }
  if (parsed <= 2) {
    return 2;
  }
  if (parsed === 3) {
    return 3;
  }
  return 4;
}

function Quote({ block }: { block: ContentBlock }) {
  const text = readText(block.data, 'text');
  if (text === null) {
    return null;
  }
  const attribution = readPlainText(block.data, 'attribution');
  return (
    <figure>
      <blockquote>
        <p>{text}</p>
      </blockquote>
      {attribution !== null ? (
        <figcaption>— {attribution}</figcaption>
      ) : null}
    </figure>
  );
}

function ListBlock({ block }: { block: ContentBlock }) {
  const items = readListItems(block.data);
  if (items.length === 0) {
    return null;
  }
  const ordered = block.data.style === 'ordered';
  const children = items.map((item, index) => (
    <li key={index}>
      {item.text}
      {item.children !== undefined && item.children.length > 0 ? (
        <ListBlock block={{ type: 'list', data: { items: item.children } }} />
      ) : null}
    </li>
  ));
  return ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
}

function CodeBlock({ block }: { block: ContentBlock }) {
  const code = readText(block.data, 'code');
  if (code === null) {
    return null;
  }
  const language = readPlainText(block.data, 'language');
  return (
    <figure>
      <pre className="bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
        {language !== null ? (
          <span className="block border-b border-neutral-300 px-4 py-1.5 font-mono text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
            {language}
          </span>
        ) : null}
        <code className="block p-4">{code}</code>
      </pre>
    </figure>
  );
}

function ImageBlock({ block }: { block: ContentBlock }) {
  const url = safeUrl(block.data.url);
  if (url === null) {
    return null;
  }
  const alt = readPlainText(block.data, 'alt') ?? '';
  const caption = readPlainText(block.data, 'caption');
  const width = readNumber(block.data.width);
  const height = readNumber(block.data.height);

  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element --
          Article images come from an arbitrary editor-chosen CDN and
          are not known at build time, so next/image cannot optimise
          them. The img carries explicit dimensions when the upstream
          provides them, which keeps CLS at zero. */}
      <img
        src={url}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="w-full"
      />
      {caption !== null ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function TableBlock({ block }: { block: ContentBlock }) {
  const table = readTable(block.data);
  if (table.rows.length === 0) {
    return null;
  }
  return (
    <table>
      {table.header.length > 0 ? (
        <thead>
          <tr>
            {table.header.map((cell, index) => (
              <th key={index} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Callout({ block }: { block: ContentBlock }) {
  const text = readText(block.data, 'text');
  if (text === null) {
    return null;
  }
  const tone = readPlainText(block.data, 'tone') ?? 'note';
  const toneClass =
    tone === 'warning'
      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
      : tone === 'danger'
        ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
        : 'border-sky-400 bg-sky-50 dark:bg-sky-950/40';
  return (
    <aside
      className={`rounded border-l-4 px-4 py-3 ${toneClass}`}
      role="note"
    >
      {text}
    </aside>
  );
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

export type { ReactNode };
