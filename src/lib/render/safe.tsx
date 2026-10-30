/**
 * Safe rendering of upstream content.
 *
 * Calliope's content format is a JSON block list, NOT HTML. That is the
 * safest possible starting position: there is no raw HTML to sanitise
 * because there is no HTML in the payload at all.
 *
 * The renderer therefore:
 *
 *   * emits React elements (never `dangerouslySetInnerHTML`), so no
 *     upstream string is ever interpreted as markup (AC-11);
 *   * treats every text field as plain text;
 *   * allowlists URL protocols and embed hosts;
 *   * renders unknown block types as a visible, inert placeholder
 *     rather than silently dropping content or guessing at it.
 *
 * If a future upstream starts shipping HTML, that HTML must be
 * sanitised with a real allowlist before it reaches the DOM. It must
 * NOT be introduced as a "simple" passthrough.
 */

import type { ReactNode } from 'react';

/** URL protocols permitted in outbound links and images. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Block types WideAngle renders. Anything else is a placeholder. */
export const KNOWN_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'list',
  'code',
  'image',
  'table',
  'callout',
  'divider',
]);

/**
 * Validate a URL for rendering.
 *
 * Returns the URL when it is safe to emit, otherwise null. Rejects
 * `javascript:`, `data:`, `vbscript:` and anything unparseable, and
 * rejects protocol-relative URLs (`//evil.example`) which would
 * silently inherit the current origin.
 */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.startsWith('//')) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Read a string field from a block's data object. */
export function readText(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : value;
}

/** Read a plain-text string, collapsing whitespace. */
export function readPlainText(
  data: Record<string, unknown>,
  key: string,
): string | null {
  const value = readText(data, key);
  if (value === null) {
    return null;
  }
  return value.replace(/\s+/g, ' ').trim();
}

export interface ListItem {
  text: string;
  children?: ListItem[];
}

/** Read a list of items, tolerating both flat strings and objects. */
export function readListItems(
  data: Record<string, unknown>,
  key = 'items',
): ListItem[] {
  const raw = data[key];
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: ListItem[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const text = entry.trim();
      if (text !== '') {
        items.push({ text: entry });
      }
      continue;
    }
    if (typeof entry === 'object' && entry !== null) {
      const candidate = entry as { text?: unknown; children?: unknown };
      const text =
        typeof candidate.text === 'string' ? candidate.text.trim() : '';
      if (text === '') {
        continue;
      }
      const children =
        Array.isArray(candidate.children)
          ? readListItems(candidate as Record<string, unknown>, 'children')
          : undefined;
      items.push({
        text: candidate.text as string,
        ...(children !== undefined && children.length > 0 ? { children } : {}),
      });
    }
  }
  return items;
}

export interface TableData {
  header: string[];
  rows: string[][];
}

/** Read a table. Accepts `header` + `rows` and a rows-only form. */
export function readTable(data: Record<string, unknown>): TableData {
  const headerRaw = data.header;
  const header = Array.isArray(headerRaw)
    ? headerRaw
        .filter((cell): cell is string => typeof cell === 'string')
        .map((cell) => cell.trim())
    : [];

  const rowsRaw = data.rows;
  const rows: string[][] = [];
  if (Array.isArray(rowsRaw)) {
    for (const row of rowsRaw) {
      if (Array.isArray(row)) {
        rows.push(
          row.map((cell) =>
            typeof cell === 'string'
              ? cell
              : cell === null || cell === undefined
                ? ''
                : String(cell),
          ),
        );
      } else if (typeof row === 'string') {
        rows.push([row]);
      }
    }
  }

  return { header, rows };
}

/** Render an unknown block type as an inert, visible placeholder. */
export function unknownBlockPlaceholder(
  type: string,
  key: string,
): ReactNode {
  return (
    <div
      key={key}
      data-block-type={type}
      className="my-6 rounded border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted"
    >
      <p className="font-medium">Unsupported content block</p>
      <p className="mt-1">
        Block type <code className="font-mono">{type}</code> is not supported by
        this frontend yet. Its content was not rendered.
      </p>
    </div>
  );
}
