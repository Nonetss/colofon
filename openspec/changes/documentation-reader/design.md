## Context

See proposal.md for the motivation. Current state that shapes the approach:

- `packages/content` reads a repository's declarations (`loadContent`: `doc.config.yaml`, catalog types, entity ids, page paths) but never opens an `.mdx` file. `packages/api/src/v1/content/reader.ts` owns the clones: one folder per repository under the clone root, `sync()` per repository, last valid declarations per folder. Nothing outside it touches a clone.
- The frontend is Astro 7 SSR with React islands mounted `client:only="react"`. Every page today is an island that reads through TanStack Query in the browser; Astro frontmatter only talks to the backend for the session (`lib/auth-server.ts`, `BACKEND_URL`).
- The chrome is React: `NavbarAuthenticated` (section row from `site-nav.ts`, mobile menu, surface search, user menu), `WithSidebar.astro` + `features/app-shell/sidebar` (only `/crons` uses it) and `AdminShell` (its own `Admin.astro` layout).
- `doc-sjd/site` is the visual reference: sticky navbar, `w-64`/`lg:w-72` sidebar with sections that collapse on a chevron while their title links, `max-w-4xl` reading column, `w-56` TOC from `xl`, window scroll, sidebar scroll and open sections kept across navigations. It is a static build that reads MDX at build time; this platform has to read it live (VISION.md).
- `DESIGN.md` ("quiet editorial") is shared by both: Space Grotesk/Space Mono, monochrome with one `primary` accent, `Text` roles. Prose styles have to be written with those tokens.

Constraints: no migration (no schema change), no curl/browser probing during implementation, content must never execute, specs `content-pages` and `documentation-reader` are the contract.

## Goals / Non-Goals

**Goals:**
- A page's HTML is produced on the server (backend parses, frontend SSR renders), so first paint shows the text and the table of contents works without waiting for data.
- One place parses pages (`packages/content`), one place caches them per commit (the content reader), one place renders them (`features/docs`).
- The tree format leaves room for platform components as islands later, without changing the procedure shape.

**Non-Goals:**
- Platform MDX components (`<Entidades>`, diagrams, catalog pages, entity pages), full-text search, `llms.txt`, "Copiar en Markdown", the full-width toggle, interactive tables, syntax highlighting, inline SVG that follows the theme, links to non-image files. Each is a later change.
- Per-organization or per-user access to repositories: every signed-in user reads every repository.
- Showing the content's declaration problems (`doc.config.yaml`, `_tipo.yaml`) in the reader; they stay in the log and the admin screens.

## Decisions

### 1. Parse with micromark's MDX extensions into mdast, convert to hast, sanitize — never compile

`packages/content/src/pages/` (new module, exported from `src/index.ts`):
- `parse.ts`: `fromMarkdown(source, { extensions: [frontmatter(["yaml"]), gfm(), mdxjs()], mdastExtensions: [...] })`. `mdxjs` (with `acorn`) is used only so ESM, expressions and JSX are *recognised* and reported precisely; they are never evaluated. Expression nodes whose estree program has no body but comments are dropped silently.
- `header.ts`: YAML front matter validated with a zod schema built per repository from the meta schema (`titulo`, `descripcion`, `icono`, `orden`, `actualizado`) plus `cabecera`, reusing `fieldSchema(field, index)` so `ref`/`ficha` header fields check against the catalog index exactly like entities do. Messages in Spanish through the same `z.locales.es()` path as `load.ts`.
- `transform.ts`: an mdast walk before conversion — reports `mdxjsEsm`/expressions, replaces each `mdxJsxFlowElement`/`mdxJsxTextElement` with a `component-notice` placeholder node, reports level 1 headings, resolves links and images (decision 6), turns `[!KIND]` blockquotes into alert nodes.
- `to-hast.ts`: `mdast-util-to-hast` without `allowDangerousHtml`, heading ids with `github-slugger` (one slugger per page), `language-*` kept on code, then `hast-util-sanitize` with GitHub's schema extended by exactly our additions (`id` on h2–h4, `class` values `language-*`, `doc-alert doc-alert-<kind>`, `doc-component-notice`, `data-component`, footnote attributes). The sanitizer is the security boundary; everything above it is best effort.
- `site.ts`: builds the whole repository: every `docs/**/*.mdx` parsed, the navigation tree, the reading order, breadcrumbs and prev/next, and the problem list per page.

Alternatives: `@mdx-js/mdx` `compile`/`evaluate` (produces and runs JS — the opposite of the contract); plain CommonMark without MDX (JSX would silently render as text and expressions as literal braces, so writers get no feedback); Astro content collections (build-time; content changes would need a rebuild).

### 2. hast over the wire, rendered by Astro with `hast-util-to-html`

`v1.docs.page` returns the sanitized hast `Root` as JSON. Its output schema is a recursive zod schema of the subset we emit (`root`, `element` with `tagName`, `properties` of string/number/boolean/string arrays, `children`; `text`), so oRPC validates it and no cast is needed on either side. The Astro page renders it with `toHtml(tree)` into `set:html`. Later, platform components arrive as elements with a `data-component` marker that the page swaps for islands.

Alternative: an HTML string from the backend — simpler today, but every future component would need to be found again by parsing HTML in the frontend.

### 3. Pages render on the server through a server-side oRPC client

New `apps/frontend/src/lib/orpc-server.ts`: `createServerClient(request)` builds an oRPC client over `RPCLink` with `url: ${BACKEND_URL}/rpc`, `method: "QUERY"` for reads, and the incoming request's `cookie` header forwarded, so the backend sees the same session the middleware validated. `pages/[repo]/[...path].astro` and `pages/index.astro` call `v1.docs.nav` and `v1.docs.page` in their frontmatter, map `NOT_FOUND` to a 404 render, and pass the navigation down. This is a new pattern (Astro frontmatter reading API data); `references/frontend/data-fetching.md` gets a section saying it is only for SSR-rendered content and never for island data.

Alternative: a `client:only` React page reading through TanStack Query (the current pattern) — the article and TOC would appear only after JS and a round trip, which is exactly what a reader shouldn't do.

### 4. Chrome: React navbar and React sidebar island, seeded from SSR

- `layouts/Docs.astro` composes `Layout`'s head pieces (font preload, theme script, service worker, `ClientRouter`) with: `NavbarAuthenticated` (persisted, as today), the sidebar island (`transition:persist="docs-sidebar"`), `<main>` with the article slot, and the TOC aside. The window scrolls; sidebar and TOC are `sticky top-(--navbar-height)`. Shared head markup is extracted from `Layout.astro` into a partial instead of copied.
- `features/docs/sidebar`: `DocsSidebar` (`client:only`) gets `initialNav` and `initialScope` props and calls `useQuery({ ...orpc.v1.docs.nav.queryOptions(), initialData })`, so it renders on hydration without a request and shares its cache with the search source. It reads the current path with `usePathname()` (persisted islands must not trust their first props for location). It is built from the shadcn `sidebar` primitives already in `components/ui` (group, menu, collapsible, sheet on mobile) styled to `doc-sjd`'s rows; a static placeholder of the same width is rendered by Astro behind it, so the column doesn't jump on first load.
- Expanded sections and scroll offset live in the persisted island across client navigations; for reloads they are saved to `sessionStorage` (key `docs-sidebar`) and restored on mount, then the current row is scrolled into view only if outside the viewport.
- Mobile: the navbar's menu button dispatches a `docs-sidebar:toggle` window event that the sidebar listens to (two islands, no shared React tree). The button renders only when `Docs.astro` stamps `data-docs-sidebar` on `<body>`, read on `astro:page-load`.

Alternative: the sidebar in Astro like `doc-sjd` (no flash) — rejected because it would re-implement the shadcn sidebar, `Text` roles and the search integration outside React; the seeded island renders on hydration with no fetch and stays mounted afterwards.

### 5. Scope: a cookie read by the server, written by the selector

Cookie `docs_scope` (`todos` or a slug, path `/`, one year, `SameSite=Lax`). `pages/index.astro` redirects to `/<slug>` when it names an existing repository; `pages/[repo]/[...path].astro` sets it to the page's repository when it holds another slug (not when it is `todos`). The selector writes it with `document.cookie` and navigates with `navigate()` from `astro:transitions/client`. With fewer than two repositories the scope is computed, not stored. Pure helpers (`resolveScope`, `scopeAfterVisit`) live in `features/docs/shared/model/scope.ts` with unit tests.

### 6. Routes, link resolution and reserved slugs

- Reader routes are `/<slug>` and `/<slug>/<page path>` with no trailing slash, matching the contract's page paths. Links are rewritten in `transform.ts` from the page's folder: `dns.mdx#zonas` → `/<slug>/red/dns#zonas`; `index.mdx` → its folder's route.
- Images become `/api/v1/docs/<slug>/files/<path under docs/>`; links to any other relative file are reported.
- Astro gives static routes priority, so `/admin`, `/login`, `/me`, `/signup`, `/404` win over `[repo]`, and the gateway sends `/api`, `/rpc`, `/git`, `/scalar`, `/openapi.json`, `/health` to the backend before the frontend sees them. A repository with one of those slugs would be unreachable, so `RESERVED_SLUGS` (in `packages/content`) is refused by the `v1.content` slug schema. A test in `packages/content` reads `apps/frontend/src/pages` and `apps/gateway/routes.caddy` from the repository and fails if a top-level route or backend prefix is missing from the list, so a new top-level page can't silently shadow a repository.

### 7. Cache per repository and commit, owned by the content reader

`ContentReader` gains `site(slug)`: it returns the parsed site for the repository's current checkout, built on first use and memoized per clone folder together with the commit it was built from (`git rev-parse HEAD` once per build). `sync()` drops the entry after every successful sync, and `remove()`/`forget()` drop it with the clone. A repository with no clone answers "no readable content". Page problems are logged once per (folder, commit), like declaration problems. `packages/api/src/v1/docs/handler.ts` only maps the site to outputs and enforces access (problems for admins only), so the docs feature never touches the filesystem.

Alternative: parse per request — a nav read parses every page, which would make each navigation cost the whole repository.

### 8. Files through an oRPC procedure with safe headers

`v1.docs.file` is `GET /v1/docs/{repository}/files/{+path}` with a `z.file()` output. The handler normalizes the path, refuses anything that resolves outside `<clone>/docs/` (including through symlinks: `realpath` must stay inside), allows only the image extensions of `content-pages`, and caps the size (10 MiB). Every response carries `X-Content-Type-Options: nosniff`, and SVG also `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, so opening an SVG directly can't run script on our origin. Headers go through oRPC's response-headers plugin; if v2's plugin can't set them on a file response, the route moves to a Hono handler next to `/git/*` with the same access check (decided while implementing, no spec change).

### 9. Page view in Astro, prose in `global.css`

`features/docs/page/components/*.astro`: `DocHero` (breadcrumbs, icon, title, description, `actualizado`, `PageTags`-like `<dl>` strip for `cabecera` fields), `DocBody` (the HTML plus the problems notice for admins), `DocToc`, `DocPager`, `DocChildren` (a section's pages, as a `divide-y` list, not cards). Text styles in Astro use `textVariants({ role, tone })` classes, never hand-built strings. Icons from `icono` resolve through the generated Lucide catalog used by `IconGlyph` (`features/entity-icons`), rendered as inline SVG from the icon node in Astro and with `IconGlyph` in the sidebar; an unknown name falls back to a document icon. One `<script>` in `Docs.astro` handles TOC highlighting, code "Copiar", external links in a new tab and heading anchors on `astro:page-load`. Prose styles (`.doc` on top of `@tailwindcss/typography`) are written in `global.css` with the `DESIGN.md` tokens, using `doc-sjd/site/src/styles/global.css` as the reference for spacing, tables, code frames and alerts.

### 10. What is removed and what stays

Removed: `features/crons`, `pages/crons/**`, the `crons`/`cron-detail` surfaces and the `cron-jobs` search source, `features/home`, `layouts/WithSidebar.astro`, `features/app-shell/sidebar`, `navbar-mobile-menu.tsx` and the navbar section row, `hooks/use-scroll-restoration.ts` (its only consumer is the removed sidebar header; checked when deleting), icon registry entries left without users. Stays: `Layout.astro`, `Detail.astro` (generic, no consumer for now), `Admin.astro` + `AdminShell` (gets a "Documentación" link to `/`), `features/comments` (no consumer for now), all cron backend code, `components/shared` (`SurfaceCard` still serves the admin overview).

## Risks / Trade-offs

- [The sidebar appears only after hydration on a full page load] → seeded `initialData` (no request) and a same-width placeholder; client navigations keep it mounted.
- [A large repository makes the first read after a sync slow] → one parse per commit; parsing is linear and repositories are small today. If it grows, build the site eagerly at the end of `sync()`.
- [The sanitizer allow-list drifts from what the frontend styles expect] → the allow-list is one exported schema with a unit test per added attribute; prose styles target only those classes.
- [Existing stored repository with a reserved slug] → it stays readable in `/admin/content` but its reader routes are shadowed; the slug can't change, so the admin deletes and recreates it. Unlikely with today's data.
- [SSR depends on the backend for every reader request] → same as the session lookup today; a backend error renders the error state instead of a blank page.
- [Removing `/crons` hides failing jobs] → the only job in use (content sync) reports its outcome per repository in `/admin/content`; cron endpoints remain available in `/scalar`.

## Migration Plan

No data migration. Deploy backend and frontend together (the frontend calls `v1.docs`). Rollback is reverting the change; nothing is stored differently. After deploy, writers whose pages use JSX or expressions will see them reported (admins) and rendered as notices; `docs/human/contenido.md` documents the accepted MDX.

## Open Questions

- Whether `icono` names that are not in the Lucide catalog should become a header problem; for now they fall back to the default icon silently, which can be tightened without changing the procedures.
