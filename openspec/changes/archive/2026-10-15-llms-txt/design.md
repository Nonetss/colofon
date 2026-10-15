## Context

The earlier documentation site is a static Astro build: its `llms.txt.ts` page builds the index from the content collection and `[...slug]/llm.txt.ts` serves each page's MDX source through `pageMarkdown`. Neither applies as is here:

- The reader is server-rendered from the backend (`v1.docs.nav`, `v1.docs.page`) through the server oRPC client (`apps/frontend/src/lib/server-link.ts`), which forwards only the visitor's cookies.
- There is no MDX source in the frontend: "Copiar en Markdown" writes the page back from its sanitized tree (`features/docs/page/model/markdown.ts`, `pageMarkdown`), embeds it as JSON in `DocToc`, and the browser turns `](/` into `](<origin>/` before copying (`page-scripts.ts`).
- `src/middleware.ts` gates every non-public path: no session → redirect to `/login`. Better Auth runs with `apiKey({ enableSessionForAPIKeys: true })`, so `getSession` already resolves an `x-api-key` header, in the frontend middleware and in the backend's `sessionMiddleware`.
- The plugin (v1.7.7) creates keys with `rateLimitEnabled: true`, 10 requests per 24 h, and the session hook enforces it on every validation.
- The frontend has no notion of its public origin: its only env var is `BACKEND_URL`; behind the gateway, `Astro.url` is `http://` (production TLS ends before Caddy).

## Goals / Non-Goals

**Goals:**
- One source of the page Markdown: `llm.txt` and "Copiar en Markdown" produce the same text, full URLs included.
- Agents authenticate with the existing API keys, no new credential type.
- The index text is built by a pure function that unit tests can cover without Astro.

**Non-Goals:**
- No `llms-full.txt` (every page concatenated), no `/llm.txt` for the "Todos" home.
- No UI affordance beyond the `<link rel="alternate">`; discovery is documented in `docs/human/contenido.md`.
- No new API procedure: `nav` and `page` already return everything needed.
- No change to the HTML reader's redirect-to-login behaviour.

## Decisions

### Routes in Astro, next to the reader

`src/pages/llms.txt.ts`, `src/pages/[repo]/llms.txt.ts` and `src/pages/[repo]/[...path]/llm.txt.ts` as `APIRoute` `GET` handlers, using `createServerClient(Astro.request)` like `[repo]/[...path].astro`. Astro ranks a static final segment above the bare rest route, so `/casa/red/dns/llm.txt` reaches the text route and `/casa/llm.txt` matches it with an empty `path`. `NOT_FOUND`/`BAD_REQUEST` from the backend become a plain 404 (`isMissing` from the reader route moves to a shared helper so both use it).

*Alternative:* a backend Hono route serving the text. Rejected: the Markdown writer lives in the frontend (hast → mdast), and the gateway would need a new mapping.

### Full URLs: a shared `withOrigin` and `CORS_ORIGIN`

`features/docs/page/model/full-links.ts` holds `withOrigin(markdown, origin)` (apart from `markdown.ts`, so the browser script doesn't bundle the hast → mdast writer) (the `](/` → `](<origin>/` rewrite); `page-scripts.ts` calls it with `window.location.origin` and the route with the public origin, so the two texts stay identical. The public origin comes from `CORS_ORIGIN`, already defined as "the public origin the browser uses": added to the `astro:env` schema as an optional server secret, and passed to the frontend service in `compose.yml` and `compose.prod.yml`. When unset, the route falls back to `Astro.url.origin`.

*Alternatives:* `X-Forwarded-Proto`/`Host` from Caddy (wrong scheme in production, where TLS ends upstream of Caddy); root-relative links like the earlier site (an agent that received the text out of context can't follow them; llmstxt.org expects absolute URLs).

### Index text as a pure model

A new `features/docs/llm-text` slice (barrel `index.ts`) with `model/llms.ts`: `llmsIndex({ title, summary, repositories, origin })` returns the whole text, walking each repository's `home` and `nodes` depth first (the same order as `flattenPages` in `features/docs/shared/model/nav.ts`; reuse it if its trail shape fits, otherwise a sibling walk). Labels are the section trail plus the title joined with ` / `; repositories with `available: false` are skipped. The global index's title and summary are constants in the model; a repository index uses `name` (what the reader's home shows) and `description`. `model/response.ts` builds the routes' plain-text answers and their 404.

### Credentials: forward `x-api-key`, 401 for text routes

- `forwardedHeaders` (`lib/server-link.ts`) copies `x-api-key` as well as `cookie`, so the backend resolves the same user the middleware did. This also fixes reader HTML pages requested with only an API key (today the middleware passes them and the backend call fails).
- The middleware asks a small helper, `isMarkdownTextPath(path)` in `src/lib` (ends in `/llms.txt` or `/llm.txt`, or is `/llms.txt`), and when there is no session answers `401` `text/plain; charset=utf-8` with a Spanish message ("Inicia sesión o envía una API key en la cabecera x-api-key.") instead of redirecting.
- A refused key makes Better Auth's `get-session` fail with 401/403, which the middleware used to answer as a 503 auth outage; those two statuses now count as no session.

### No per-key rate limit

`packages/auth`: `apiKey({ enableSessionForAPIKeys: true, rateLimit: { enabled: false } })`. The plugin stores `rateLimitEnabled` per key at creation, so this applies to keys created from now on; the procedure body stays as is (passing `rateLimitEnabled` from `v1.apiKey.create` would be refused as a server-only property, because the call carries the admin's headers).

*Alternative:* a higher limit (e.g. 1000/h). The user chose no limit; expiry and revocation remain the controls.

### Alternate link through a head slot

`Layout.astro` gets a named `head` slot inside `<head>`; `Docs.astro` passes it through; `[repo]/[...path].astro` fills it with `<link rel="alternate" type="text/markdown" href={`${page.href}/llm.txt`}>`. An absolute path, because reader routes have no trailing slash (the earlier site's relative `href="llm.txt"` would resolve to the parent).

### Response headers

`Content-Type: text/plain; charset=utf-8` (browsers show it inline; `text/markdown` triggers downloads in some) and `Cache-Control: private, no-cache`, since the answer depends on the credential.

## Risks / Trade-offs

- [Keys created before this change keep 10 requests/24 h] → documented in `docs/human/contenido.md`: recreate the key used by agents.
- [No rate limit: a leaked key can read everything quickly] → keys are admin-only, expire (30 days by default) and can be revoked from `/admin/api-keys`.
- [Each text request validates the key twice (frontend middleware and backend)] → acceptable without a rate limit; one extra lookup per request.
- [A page file named `llms.txt.mdx` or `llm.txt.mdx` would be shadowed by the text routes] → negligible; such names don't occur in content repositories.
- [`CORS_ORIGIN` missing in a deployment] → falls back to the request's origin, still a working URL in dev and in `compose.yml`.
- [API keys belong to admins, so an agent reads with an admin's view] → the Markdown never includes problems or admin-only data; the content is the same for every user.
