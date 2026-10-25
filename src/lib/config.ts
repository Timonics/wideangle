/**
 * WideAngle publication configuration.
 *
 * Everything that describes the *publication* (as opposed to its
 * content) lives here and is read from the environment. WideAngle is a
 * read-only frontend: it never creates, edits, or publishes content,
 * so all of this is operator-owned configuration.
 *
 * Server-side only. Nothing in this module may be imported from a
 * client component.
 */

/** Publication identity + delivery settings. */
export interface PublicationConfig {
  name: string;
  description: string;
  /** Absolute origin, no trailing slash. Used to build every canonical URL. */
  canonicalOrigin: string;
  locale: string;
  /**
   * Optional future publication identifier. WideAngle v1 serves one
   * blog; this is inert until Calliope advertises publication-scoped
   * reads (see `calliope/scope.ts`).
   */
  publicationId?: string;
}

/** Connection details for the upstream Calliope service. */
export interface CalliopeConfig {
  baseUrl: string;
  /** The blog (publication) UUID to read from. */
  blogId: string;
  /** How long a cached upstream read may be reused, in seconds. */
  revalidateSeconds: number;
  /** Per-request timeout for upstream calls, in milliseconds. */
  timeoutMs: number;
  /**
   * True only when Calliope is known to support publication-scoped
   * reads. Off by default: an unknown query parameter would be
   * silently ignored by the current API, which would make the scope
   * look like it works when it does not.
   */
  supportsPublicationScope: boolean;
}

/** Everything WideAngle needs to render, in one validated object. */
export interface WideAngleConfig {
  publication: PublicationConfig;
  calliope: CalliopeConfig;
  /** Contact address rendered on /contact and in the footer. */
  contactEmail: string;
  /** Hostnames allowed to serve article imagery. */
  imageHosts: string[];
}

export class ConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const DEFAULT_CALLIOPE_BASE_URL = 'http://localhost:3002';
const DEFAULT_REVALIDATE_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Origins that must never reach production metadata (AC-13). A staging
 * or localhost canonical URL leaking into production `<link
 * rel="canonical">` is a real, silent SEO failure — so it is a boot
 * error, not a warning.
 */
const NON_PRODUCTION_ORIGIN_PATTERN =
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i;

/**
 * Escape hatch for local verification.
 *
 * `next build` always runs with NODE_ENV=production, so a local
 * production build against a localhost origin would otherwise be
 * impossible to produce. Setting WIDEANGLE_ALLOW_LOCAL_ORIGIN=true
 * skips the guard.
 *
 * This must NEVER be set in a real deployment — it disables the check
 * that keeps development origins out of production metadata. It is
 * explicit and opt-in precisely so that disabling it is a deliberate
 * act rather than an accident.
 */
function localOriginAllowed(): boolean {
  return optional('WIDEANGLE_ALLOW_LOCAL_ORIGIN') === 'true';
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new ConfigError(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function positiveInt(name: string, fallback: number): number {
  const raw = optional(name);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ConfigError(
      `${name} must be a positive integer, received "${raw}".`,
    );
  }
  return parsed;
}

function booleanFlag(name: string, fallback: boolean): boolean {
  const raw = optional(name);
  if (raw === undefined) {
    return fallback;
  }
  if (['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(raw.toLowerCase())) {
    return false;
  }
  throw new ConfigError(`${name} must be a boolean, received "${raw}".`);
}

function normaliseOrigin(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ConfigError(
      `WIDEANGLE_CANONICAL_ORIGIN is not a valid origin: "${raw}".`,
    );
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new ConfigError(
      'WIDEANGLE_CANONICAL_ORIGIN must be an origin without a path ' +
        `(received "${raw}").`,
    );
  }
  return url.origin;
}

function parseImageHosts(raw: string | undefined): string[] {
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host !== '');
}

/**
 * Build the validated runtime configuration.
 *
 * Throws `ConfigError` on anything missing or malformed. Callers that
 * must not fail (build-time prerender of static shells) should use
 * `tryGetConfig` and degrade instead.
 */
export function getConfig(): WideAngleConfig {
  const canonicalOrigin = normaliseOrigin(
    required('WIDEANGLE_CANONICAL_ORIGIN'),
  );

  if (
    process.env.NODE_ENV === 'production' &&
    !localOriginAllowed() &&
    NON_PRODUCTION_ORIGIN_PATTERN.test(canonicalOrigin)
  ) {
    throw new ConfigError(
      `WIDEANGLE_CANONICAL_ORIGIN must not be a local origin in production ` +
        `(received "${canonicalOrigin}"). Every canonical URL, sitemap ` +
        'entry and feed item would point at a development host.',
    );
  }

  const baseUrlRaw = optional('WIDEANGLE_CALLIOPE_BASE_URL') ??
    DEFAULT_CALLIOPE_BASE_URL;
  let baseUrl: string;
  try {
    baseUrl = new URL(baseUrlRaw).origin;
  } catch {
    throw new ConfigError(
      `WIDEANGLE_CALLIOPE_BASE_URL is not a valid URL: "${baseUrlRaw}".`,
    );
  }

  const publicationId = optional('WIDEANGLE_PUBLICATION_ID');

  return {
    publication: {
      name: optional('WIDEANGLE_PUBLICATION_NAME') ?? 'WideAngle',
      description:
        optional('WIDEANGLE_PUBLICATION_DESCRIPTION') ??
        'A single-author publication about building and operating content infrastructure.',
      canonicalOrigin,
      locale: optional('WIDEANGLE_LOCALE') ?? 'en',
      ...(publicationId === undefined ? {} : { publicationId }),
    },
    calliope: {
      baseUrl,
      blogId: required('WIDEANGLE_CALLIOPE_BLOG_ID'),
      revalidateSeconds: positiveInt(
        'WIDEANGLE_CONTENT_REVALIDATE_SECONDS',
        DEFAULT_REVALIDATE_SECONDS,
      ),
      timeoutMs: positiveInt(
        'WIDEANGLE_CALLIOPE_TIMEOUT_MS',
        DEFAULT_TIMEOUT_MS,
      ),
      supportsPublicationScope: booleanFlag(
        'WIDEANGLE_CALLIOPE_SUPPORTS_PUBLICATION_SCOPE',
        false,
      ),
    },
    contactEmail:
      optional('WIDEANGLE_CONTACT_EMAIL') ?? 'hello@example.com',
    imageHosts: parseImageHosts(optional('WIDEANGLE_IMAGE_HOSTS')),
  };
}

/**
 * Non-throwing variant. Used by build-time code paths that should
 * render a degraded shell rather than abort a build.
 */
export function tryGetConfig(): WideAngleConfig | null {
  try {
    return getConfig();
  } catch {
    return null;
  }
}
