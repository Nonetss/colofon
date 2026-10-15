## Why

The platform already stores, hosts and syncs content repositories, but nobody can read them: the frontend is still the template's module console (a home of surface cards, `/crons`, an Admin section in the navbar). The product is a documentation platform modelled on `doc-sjd`, so the main surface has to become a documentation reader that looks and reads like it: a navbar, a sidebar with the sections and pages, the page in a reading column and its table of contents. This is the "Web de documentación" piece of `VISION.md`, and it needs the backend to turn MDX into something the web can render without ever executing content.

## What Changes

- **Pages are read without executing anything.** `packages/content` parses each `docs/**/*.mdx` file into a validated header (`titulo`, `descripcion`, `icono`, `orden`, `actualizado` plus the site's `cabecera` fields) and a sanitized HTML tree (hast): GitHub-flavoured Markdown, GitHub alerts (`> [!NOTE]`), heading ids, code blocks with their language, links between pages rewritten to reader routes and images served from the repository. `import`/`export` and `{expressions}` are refused (MDX comments are dropped), and every JSX element is reported as a component the platform does not provide yet, rendered as a visible notice. Problems are reported per file in Spanish, like the rest of the contract.
- **Reader API.** A new `v1.docs` feature for signed-in users: the navigation of every repository (sections from folders, pages ordered by `orden` then title), one page (header, tree, headings, breadcrumbs, previous/next, problems for admins) and the repository's images. Results are cached per repository and commit and dropped on every sync.
- **Documentation layout like `doc-sjd`.** A new `Docs.astro` layout: sticky navbar, a sidebar with the sections and pages of the current scope, the page in a reading-width column (`PageHero`-style header, header fields, prose body, previous/next) and an "En esta página" table of contents on wide screens. Pages are rendered on the server from the tree, so the text shows without waiting for JavaScript. On phones the sidebar opens as a sheet from the navbar.
- **Repository selector with "Todos".** The top of the sidebar offers a select with every repository plus "Todos". A repository shows only its sections; "Todos" shows every repository as a top-level group. The choice is remembered in a cookie, follows the page being read, and scopes the navbar search to the selected repository's pages.
- **Routes.** `/` is the "Todos" home (each repository with its description and sections, as a document, not cards) or redirects to the selected repository; `/<slug>/` is a repository's home (`docs/index.mdx`); `/<slug>/<page path>` is a page. Repository slugs that would collide with the app's own top-level routes or the gateway's backend prefixes are refused on creation.
- **BREAKING (UI): crons leave the frontend.** `/crons`, `/crons/[id]`, `features/crons`, their surfaces and their navbar search source are removed. The scheduler, the cron endpoints and the content sync job stay in the backend unchanged; sync status stays visible in `/admin/content`.
- **Admin moves to the account menu.** `/admin` keeps its own shell and routes, but it is no longer a navbar section or a home card: admins reach it from an "Administración" entry in the user menu, and the admin shell links back to the documentation.
- **The module chrome goes.** The home of surface cards (`features/home`), the navbar's section row and its mobile menu, and the section-sidebar layout (`WithSidebar.astro`, `features/app-shell/sidebar`), whose only consumer was `/crons`, are removed; `Layout.astro` stays for `/me`, login, signup and 404. The comments slice stays in place without a consumer.

## Capabilities

### New Capabilities

- `content-pages`: how a page file becomes a header and a render tree: the header fields and their validation, the accepted MDX subset and what is refused, alerts, heading ids, link and image resolution, the section tree and page order, and how page problems are reported.
- `documentation-reader`: the `v1.docs` procedures (navigation, page, files), their access and caching, and the web reader: routes, the `Docs.astro` layout, sidebar and repository selector with "Todos", page header and body, table of contents, previous/next, the "Todos" home, empty and error states, and the page search source.

### Modified Capabilities

- `web-navigation`: the authenticated navbar no longer renders section links or a mobile section menu (it opens the documentation sidebar instead); admin is reached from the account menu; the page layouts are `Layout`, `Docs`, `Detail` and `Admin` (no `WithSidebar`, no section-sidebar scroll restoration); the cron job search source is replaced by the documentation page source.
- `cron-management`: the web interface requirements (`/crons`, `/crons/{id}`, the schema-driven job editor, comments on runs, read-only rendering of code jobs) are removed; the endpoints and scheduler requirements stay.
- `content-repository-management`: a slug cannot be one of the reserved top-level names used by the frontend routes or the gateway.
- `frontend-data-table`: the cron job list and run history leave the list of data tables; the requirement for the single cron job table is removed.
- `list-filter-experience`: the requirements that name `/crons` and the cron pages as examples of opt-in behavior drop them.

## Impact

- **packages/content**: new page module (MDX parse, header schema, hast conversion and sanitization, link resolution, navigation tree) with its tests; new dependencies from the unified ecosystem (`mdast-util-from-markdown`, `micromark-extension-mdxjs`, `mdast-util-mdx`, GFM and frontmatter extensions, `mdast-util-to-hast`, `hast-util-sanitize`, `github-slugger`), pinned in the root catalog.
- **packages/api**: new `src/v1/docs/` feature (input/output/handler/router) on top of the content reader, a per-commit cache invalidated by syncs, reserved-slug validation in `v1.content`, tests for both.
- **apps/frontend**: new `Docs.astro` layout, `pages/index.astro` and `pages/[repo]/[...path].astro`, new `features/docs` slices, a server-side oRPC client for Astro frontmatter, prose styles in `global.css`, `hast-util-to-html`; removals listed above; `app-surfaces.ts`, `site-nav.ts`, the navbar, user menu and surface search sources updated; middleware unchanged (every reader route requires a session).
- **No database change and no migration.** No gateway change (reader routes go to the frontend, files under `/api/*` to the backend).
- **Docs**: `VISION.md` (state of the reader), `PRODUCT.md` (pages and surfaces), `docs/human/contenido.md` (what MDX a page may use, and that the sync job is no longer listed in `/crons`), and the `stack` skill references for layouts, navigation and cron.
