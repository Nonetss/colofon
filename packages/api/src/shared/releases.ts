/** The running version: `/tag` sets it to the release's version
 *  (`scripts/set-version.sh`) before tagging, so it names the release. */
export const APP_VERSION = "0.4.5"

const LATEST_RELEASE_URL =
  "https://api.github.com/repos/Nonetss/colofon/releases/latest"

// Found releases are kept for hours; a failed lookup is retried sooner.
const RELEASE_TTL_MS = 6 * 60 * 60 * 1000
const FAILURE_TTL_MS = 30 * 60 * 1000
const REQUEST_TIMEOUT_MS = 5000

const VERSION = /^\d+\.\d+\.\d+$/

/** A published GitHub release. */
export type LatestRelease = {
  version: string
  url: string
  publishedAt: string
}

/** Whether a value is a `major.minor.patch` version. */
export function isVersion(value: string) {
  return VERSION.test(value)
}

function parts(version: string) {
  return version.split(".").map((part) => Number.parseInt(part, 10))
}

/** Negative, zero or positive as `a` is older than, equal to or newer than `b`. */
export function compareVersions(a: string, b: string) {
  const left = parts(a)
  const right = parts(b)
  for (let index = 0; index < 3; index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function stringField(body: object, field: string) {
  if (!(field in body)) return null
  const value: unknown = Reflect.get(body, field)
  if (typeof value !== "string") return null
  return value
}

/** The release in GitHub's `releases/latest` body; null when it does not
 *  carry a `vX.Y.Z` tag, a page URL and a publication date. */
export function parseLatestRelease(body: unknown): LatestRelease | null {
  if (typeof body !== "object" || body === null) return null
  const tag = stringField(body, "tag_name")
  const url = stringField(body, "html_url")
  const publishedAt = stringField(body, "published_at")
  if (tag === null || url === null || publishedAt === null) return null
  const version = tag.replace(/^v/, "")
  if (!isVersion(version)) return null
  return { version, url, publishedAt }
}

/** The release newer than `current`, or null when there is none. */
export function newerRelease(
  current: string,
  latest: LatestRelease | null
): LatestRelease | null {
  if (latest === null) return null
  if (compareVersions(latest.version, current) <= 0) return null
  return latest
}

async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "colofon",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status} for the latest release`)
  }
  return parseLatestRelease(await response.json())
}

type CachedRelease = { release: LatestRelease | null; expiresAt: number }

/**
 * The latest release, looked up at most once per TTL however many requests
 * ask, with concurrent lookups sharing one fetch. A failure answers null
 * (no notice) and is reported to the caller that ran the lookup.
 */
export function createReleaseFeed({
  load,
  now,
}: {
  load: () => Promise<LatestRelease | null>
  now: () => number
}) {
  const state: {
    cached: CachedRelease | null
    pending: Promise<LatestRelease | null> | null
  } = { cached: null, pending: null }

  async function refresh(onFailure: (error: unknown) => void) {
    try {
      const release = await load()
      state.cached = { release, expiresAt: now() + RELEASE_TTL_MS }
      return release
    } catch (error) {
      onFailure(error)
      state.cached = { release: null, expiresAt: now() + FAILURE_TTL_MS }
      return null
    } finally {
      state.pending = null
    }
  }

  return {
    latest(onFailure: (error: unknown) => void) {
      if (state.cached !== null && state.cached.expiresAt > now()) {
        return Promise.resolve(state.cached.release)
      }
      if (state.pending !== null) return state.pending
      state.pending = refresh(onFailure)
      return state.pending
    },
  }
}

export const releaseFeed = createReleaseFeed({
  load: fetchLatestRelease,
  now: Date.now,
})
