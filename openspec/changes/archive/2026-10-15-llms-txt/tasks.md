## 1. Credentials

- [x] 1.1 `packages/auth/src/index.ts`: `apiKey({ enableSessionForAPIKeys: true, rateLimit: { enabled: false } })`; verify with `bun run check-types` and that `packages/api/tests/v1/api-key/handler.test.ts` still passes
- [x] 1.2 `apps/frontend/src/lib/server-link.ts`: `forwardedHeaders` also copies `x-api-key`; update `apps/frontend/tests/unit/lib/server-link.test.ts` to assert the key is forwarded with the cookie, alone without a cookie, and that other headers are still dropped
- [x] 1.3 Add `isMarkdownTextPath(path)` in `apps/frontend/src/lib/` with tests in `apps/frontend/tests/unit/lib/` (`/llms.txt`, `/casa/llms.txt`, `/casa/llm.txt`, `/casa/red/dns/llm.txt` are text paths; `/casa/red/dns`, `/llms.txt/x`, `/casa/llm.txtx` are not)
- [x] 1.4 `apps/frontend/src/middleware.ts`: a 401/403 from session resolution (a refused `x-api-key`) counts as no session instead of a 503; without a session, a text path answers 401 `text/plain; charset=utf-8` with the Spanish message (still appending refreshed cookies) instead of redirecting; verify by reading the branch against the spec scenario "No credential"

## 2. Shared Markdown pieces

- [x] 2.1 `features/docs/page/model/full-links.ts` (apart from `markdown.ts`, so the browser script doesn't load the Markdown writer): add `withOrigin(markdown, origin)` and make `page-scripts.ts` use it; test it in `apps/frontend/tests/unit/features/docs/page/full-links.test.ts` (links and images to `/…` become full, external and `#` links are untouched)
- [x] 2.2 Move the reader route's `isMissing` to a shared helper of the docs feature (search `features/docs/shared` first) and use it from `[repo]/[...path].astro`; test it (NOT_FOUND and BAD_REQUEST are missing, other ORPCErrors and plain errors are not)
- [x] 2.3 Add `CORS_ORIGIN` (optional, server, secret) to the `astro:env` schema in `apps/frontend/astro.config.mjs` and pass it to the frontend service in `compose.yml` (`compose.prod.yml` and `compose.dev.yml` already load the root `.env`); add a helper that returns it or falls back to the request's origin, with tests for both cases

## 3. Index model

- [x] 3.1 Create the `features/docs/llm-text` slice (`index.ts` barrel, `model/llms.ts`) with `llmsIndex` for the global and per-repository indexes, reusing `flattenPages` from `features/docs/shared/model/nav.ts` if its trails fit
- [x] 3.2 Tests in `apps/frontend/tests/unit/features/docs/llm-text/llms.test.ts`: heading, quote and credentials paragraph; one `##` per available repository in nav order; unavailable repositories skipped; home first, then sections and pages depth first; nested labels joined with ` / `; `: description` only when not empty; links are `<origin><href>/llm.txt`; a repository index has its own heading and no `##` per repository

## 4. Routes and head link

- [x] 4.1 `src/pages/[repo]/[...path]/llm.txt.ts`: read `v1.docs.page`, answer `withOrigin(pageMarkdown(…), origin)` with `text/plain; charset=utf-8` and `Cache-Control: private, no-cache`; 404 on a missing page
- [x] 4.2 `src/pages/llms.txt.ts` and `src/pages/[repo]/llms.txt.ts`: read `v1.docs.nav` and answer `llmsIndex`; the repository index answers 404 for an unknown or unavailable repository
- [x] 4.3 `Layout.astro` gets a named `head` slot, `Docs.astro` forwards it and `[repo]/[...path].astro` fills it with `<link rel="alternate" type="text/markdown" href={`${page.href}/llm.txt`}>`; verify with `bun run check-types`

## 5. Documentation

- [x] 5.1 `docs/human/contenido.md` ("Cómo se leen las fichas"): how to give the documentation to an AI (`/llms.txt`, `/<repo>/llms.txt`, `<página>/llm.txt`, an API key in `x-api-key`, keys created before this change must be recreated)
- [x] 5.2 `stack` skill: `references/env.md` (middleware answers 401 for text paths, `x-api-key` forwarded, the frontend's `CORS_ORIGIN`) and `references/frontend/navigation-and-layouts.md` (the `head` slot, the text routes beside the reader, the `llm-text` slice); `references/workspaces.md` only if it lists frontend routes

## 6. Validation

- [x] 6.1 From the worktree root run `bun run check-types`, `bunx biome check` on the touched files and `bun run test`; all pass
