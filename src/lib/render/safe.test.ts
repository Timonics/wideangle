import { describe, it, expect } from 'vitest';
import { safeUrl, readListItems, readTable } from '@/lib/render/safe';

describe('safeUrl', () => {
  it('accepts https and http URLs', () => {
    expect(safeUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
    expect(safeUrl('http://example.com/a.png')).toBe(
      'http://example.com/a.png',
    );
  });

  it('accepts mailto', () => {
    expect(safeUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com',
    );
  });

  it('rejects javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeUrl('  javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects vbscript: URLs', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeUrl('//evil.example.com/x')).toBeNull();
  });

  it('rejects non-URLs and empty values', () => {
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('   ')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl(42)).toBeNull();
  });
});

describe('readListItems', () => {
  it('reads a flat string list', () => {
    expect(readListItems({ items: ['a', 'b'] })).toEqual([
      { text: 'a' },
      { text: 'b' },
    ]);
  });

  it('reads nested children', () => {
    const items = readListItems({
      items: [{ text: 'parent', children: ['child'] }],
    });
    expect(items).toHaveLength(1);
    expect(items[0].children).toEqual([{ text: 'child' }]);
  });

  it('drops empty entries', () => {
    expect(readListItems({ items: ['  ', 'keep'] })).toEqual([{ text: 'keep' }]);
  });

  it('returns an empty list for a missing items field', () => {
    expect(readListItems({})).toEqual([]);
    expect(readListItems({ items: 'not an array' })).toEqual([]);
  });
});

describe('readTable', () => {
  it('reads a header and rows', () => {
    const table = readTable({
      header: ['A', 'B'],
      rows: [['1', '2']],
    });
    expect(table.header).toEqual(['A', 'B']);
    expect(table.rows).toEqual([['1', '2']]);
  });

  it('handles a rows-only table', () => {
    const table = readTable({ rows: [['1']] });
    expect(table.header).toEqual([]);
    expect(table.rows).toEqual([['1']]);
  });

  it('coerces non-string cells to strings', () => {
    const table = readTable({ rows: [[1, null, undefined]] });
    expect(table.rows).toEqual([['1', '', '']]);
  });
});
