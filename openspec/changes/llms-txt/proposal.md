## Why

doc-sjd lets an AI read the documentation without the HTML: `/llms.txt` (per [llmstxt.org](https://llmstxt.org)) lists every page with a link to its Markdown, and `<page>/llm.txt` serves that Markdown, the same text "Copiar en Markdown" copies. The reader here already writes a page back as Markdown for that button, but there is no route an agent can fetch, so pointing an AI at the documentation still means pasting pages by hand.

## What Changes

- New `/<slug>/<page path>/llm.txt` (and `/<slug>/llm.txt` for a repository's home): the page as Markdown, exactly what "Copiar en Markdown" copies, as `text/plain`.
- New `/llms.txt`: the index of every available repository, one `##` group per repository, each page as a link to its `llm.txt` with its description, absolute URLs on the public origin.
- New `/<slug>/llms.txt`: the same index for one repository.
- Every reader page announces its Markdown with `<link rel="alternate" type="text/markdown">` pointing at its `llm.txt`.
- Access works like the reader: a session cookie **or** an API key in the `x-api-key` header. Without a credential, these text routes answer `401` in plain text instead of redirecting to `/login`, so an agent sees why it failed.
- The server-side oRPC client forwards the visitor's `x-api-key` to the backend along with the cookies. Side effect: the reader's HTML pages also render for a request authenticated only by an API key (today the middleware lets it through but the backend call fails).
- API keys are created without a per-key rate limit. The plugin's default (10 validations per 24 h, and each Markdown request spends two) would stop an agent after a handful of pages. Keys already created keep their stored limit and have to be recreated.
- Human docs explain how to hand the documentation to an AI (`/llms.txt` plus an API key).

## Capabilities

### New Capabilities
- `documentation-llm-text`: the Markdown text routes for AIs: `llms.txt` indexes (global and per repository), `llm.txt` per page, their access rules and how a page announces its Markdown.

### Modified Capabilities
- `documentation-reader`: "Reader routes" now serves signed-in users authenticated by a session or by an `x-api-key`, not only by a session cookie.
- `api-key-management`: "Create an API key" creates keys without a per-key rate limit.

## Impact

- `apps/frontend`: new routes under `src/pages/` (`llms.txt.ts`, `[repo]/llms.txt.ts`, `[repo]/[...path]/llm.txt.ts`); a new model for the index text in the docs feature; `src/middleware.ts` (401 for the text routes); `src/lib/server-link.ts` (forward `x-api-key`); `src/layouts/Layout.astro` and `Docs.astro` (a head slot for the alternate link); the reader route passes the link; `astro.config.ts` env schema reads the public origin (`CORS_ORIGIN`).
- `compose.yml` / `compose.prod.yml`: the frontend service receives `CORS_ORIGIN`.
- `packages/auth` (the `apiKey()` plugin's `rateLimit` option) and possibly `packages/api/src/v1/api-key/handler.ts`; the `apikey` table already has the rate-limit columns, so no schema change.
- Reuses `pageMarkdown` (`features/docs/page/model/markdown.ts`), `v1.docs.nav` and `v1.docs.page`; no new procedure, no database change, no migration.
- Docs: `docs/human/contenido.md`, the `stack` skill's `references/env.md` (middleware gating, forwarded headers, frontend env) and `references/frontend/navigation-and-layouts.md`.
