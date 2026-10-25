import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, ConfigError } from '@/lib/config';

const ORIGINAL_ENV = { ...process.env };

describe('config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'https://wideangle.example.com';
    process.env.WIDEANGLE_CALLIOPE_BLOG_ID =
      '7604f178-68f6-4e65-9d79-de091b1ead15';
    delete process.env.WIDEANGLE_PUBLICATION_ID;
    delete process.env.WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE;
    delete process.env.WIDEANGLE_CONTENT_REVALIDATE_SECONDS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  it('requires the canonical origin', () => {
    delete process.env.WIDEANGLE_CANONICAL_ORIGIN;
    expect(() => getConfig()).toThrow(ConfigError);
  });

  it('requires the blog id', () => {
    delete process.env.WIDEANGLE_CALLIOPE_BLOG_ID;
    expect(() => getConfig()).toThrow(ConfigError);
  });

  it('normalises an origin without a scheme', () => {
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'wideangle.example.com';
    expect(getConfig().publication.canonicalOrigin).toBe(
      'https://wideangle.example.com',
    );
  });

  it('rejects an origin with a path', () => {
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'https://example.com/blog';
    expect(() => getConfig()).toThrow(ConfigError);
  });

  it('refuses a localhost origin in production (AC-13)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'http://localhost:3000';
    expect(() => getConfig()).toThrow(/must not be a local origin/);
  });

  it('allows a localhost origin outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    process.env.WIDEANGLE_CANONICAL_ORIGIN = 'http://localhost:3000';
    expect(getConfig().publication.canonicalOrigin).toBe('http://localhost:3000');
  });

  it('carries an optional publication id', () => {
    process.env.WIDEANGLE_PUBLICATION_ID = 'pub-123';
    expect(getConfig().publication.publicationId).toBe('pub-123');
  });

  it('omits the publication id when it is not set', () => {
    expect(getConfig().publication.publicationId).toBeUndefined();
  });

  it('defaults publication scope support to off', () => {
    expect(getConfig().calliope.supportsPublicationScope).toBe(false);
  });

  it('rejects a non-numeric revalidate window', () => {
    process.env.WIDEANGLE_CONTENT_REVALIDATE_SECONDS = 'soon';
    expect(() => getConfig()).toThrow(ConfigError);
  });

  it('rejects a non-boolean scope flag', () => {
    process.env.WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE = 'maybe';
    expect(() => getConfig()).toThrow(ConfigError);
  });

  it('parses an image host allowlist', () => {
    process.env.WIDEANGLE_IMAGE_HOSTS = 'cdn.example.com, img.example.org';
    expect(getConfig().imageHosts).toEqual([
      'cdn.example.com',
      'img.example.org',
    ]);
  });
});
