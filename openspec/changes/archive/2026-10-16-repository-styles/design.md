## Context

- The platform's styles are split by piece: `apps/frontend/src/styles/theme.css` (tokens on `:root` and `.dark`, plus `@theme inline`) and `styles/doc/{page,hints,code,tables,diagrams,images,callouts,sections}.css`, all bundled by Tailwind into one stylesheet that `Layout.astro` links in `<head>`. The `doc/` modules are plain CSS in `@layer components`, with selectors starting at `.typeset.doc`. The tokens are unlayered.
- `packages/api/src/v1/content/reader.ts` builds each repository's `Site` once per checkout (`siteOf` → `buildSite` → `readSite`), and a successful sync drops it. `readSite` (`packages/content/src/pages/site.ts`) already lists `docs/`, collects site problems (reserved files, `menu.yaml`, diagrams) and hangs them on the home (`withSiteProblems`). It receives `routes.fileUrlOf`, the reader's URL for an image under `docs/`.
- `v1.docs.page` maps a `SitePage` to the reader's output. `pages/[repo]/[...path].astro` renders it inside `Docs.astro`, under Astro's `ClientRouter`, which swaps `<body>` on navigation and keeps the sidebar island persisted.
- The app sets no Content-Security-Policy, so an inline `<style>` needs no nonce.
- Content repositories may be written by people outside the team (proposal). Their CSS is untrusted input.

## Goals / Non-Goals

**Goals:**

- A repository restyles its own reader pages module by module, tokens included, and wins over the platform where they meet.
- No resource a repository's CSS names can leave the origin or the repository's own images, and nothing it writes can break out of the stylesheet.
- No extra request and no flash of unstyled content: the styles arrive with the page.

**Non-Goals:**

- Scoping a repository's selectors to the page column. The stylesheet applies to the whole reader page, the navbar and the sidebar included. Only the pages it applies to are limited.
- Serving the platform's modules for writers to copy. `doc-example` documents the modules, their main classes and the theme variables.
- Fonts or other non-image files from the repository. Only `data:` fonts are allowed.
- Styles for the "Todos" home, `/admin`, the editor, or the `llms.txt` routes.
- Validating that a rule targets real platform classes.

## Decisions

### A fixed set of module names, in Spanish, joined in the platform's order

`estilos/` holds at most one file per platform module, named in Spanish like the rest of the contract (`catalogo/`, `diagramas/`): `tema`, `pagina`, `controles`, `codigo`, `tablas`, `diagramas`, `imagenes`, `avisos`, `secciones`. The names and their order live in one list (`src/styles/modules.ts`), which mirrors the import order of `global.css`. A writer who copies a platform module and edits it gets the same cascade among their own modules as the platform has.

- *Alternative: any `*.css` under `estilos/`, joined alphabetically.* Simpler, but it loses the link between a repository file and the platform piece it restyles, and alphabetical order would put `avisos` before `tablas` against the platform's order. A fixed list also lets the platform report typos (`tables.css`).

### Unlayered and after the platform, instead of a cascade layer

The cleaned stylesheet is served as plain, unlayered CSS and placed after the platform's stylesheet. "Over the platform" then means:

- It beats every platform rule in `@layer base/components/utilities`, since unlayered beats layered.
- It beats the unlayered platform rules (the tokens on `:root`/`.dark`, the lightbox) when the selector weight is equal, because it comes later.

- *Alternative: `@layer repo`, declared after `utilities`.* That would beat the platform's layers, but a layered rule always loses to unlayered ones. `:root { --primary: … }` in `tema.css` would then never win against `theme.css`'s unlayered tokens, which is the most useful override. A writer can still use `@layer` inside a module (it is allowed) to lower a rule of their own.

### Delivered inside the page, as an inline `<style>` at the end of the page body

`v1.docs.page` returns `styles: string | null`. `Docs.astro` renders it with `<style is:inline set:html={styles}>` after the page content, inside `<body>`.

- Inside `<body>`, it comes after the `<head>` stylesheet in document order, which the cascade needs.
- `ClientRouter` swaps `<body>`, so the styles arrive and leave with each page. Going to another repository, to the "Todos" home or to `/admin` leaves no trace. No head-diffing rules are needed.
- The styles are in the server-rendered HTML, so the first paint is styled and no extra request is made.
- The cost is the stylesheet's bytes in every page of that repository (at most 128 KiB, usually a few KiB), and no separate browser caching.

- *Alternative: a `/api/v1/docs/{repository}/styles.css` route and a `<link>`.* It is cacheable, but a `<link>` in `<head>` lands before or after Astro's own stylesheet depending on how Astro orders head content. A `<link>` in `<body>` loads after the swap, so it flashes unstyled on every navigation into the repository. Neither is worth it at this size.

### Cleaning with css-tree's AST, on an allow-list

`src/styles/clean.ts` parses each module with `css-tree`, with positions on and `parseCustomProperty: true` so custom property values are parsed like any other value instead of kept as raw text. It walks the tree and removes what is not allowed, then generates the CSS (which drops comments):

- **At-rules.** Allow-list: `media`, `supports`, `container`, `layer`, `keyframes` (and the `-webkit-` prefix), `font-face`, `property`, `scope` and `starting-style`. Any other at-rule is removed with its block.
- **Resources.** Every `Url` node, and every `String` that is an argument of `image-set()`, `-webkit-image-set()` or `src()`, is checked. A `data:` URI is kept when its media type is `image/*` or `font/*`. A relative path is resolved from `estilos/` with POSIX path rules. It must land under `docs/`, satisfy `isImageFile` and exist in the listed `docs/` files (the list `readSite` already reads). The URL is then replaced by `fileUrlOf(<path under docs/>)`. Anything else removes the whole declaration (or the `@font-face` `src` declaration) that holds it.
- **Properties.** `behavior` and `-moz-binding` are removed.
- **Names.** At-rule, function and property names are compared after `ident.decode` and lowercasing. css-tree keeps `u\72l("…")` as a function named `u\72l`, which a browser reads as `url("…")`.
- **`<`.** Every `<` in the generated text is written as the CSS escape `\3c `. Inside strings and URLs it reads back as `<`. Anywhere else `<` is invalid CSS anyway, and the escape only keeps it invalid. The output can never close the `<style>` it is inlined in.
- **What css-tree cannot parse.** css-tree recovers from errors by keeping `Raw` nodes, and these are never served. A `Raw` fragment in a block is removed. A rule, at-rule or declaration whose selector, prelude or value holds one is removed whole. Each removal is reported with its line. Leaving the whole module out on any parse error was the first plan, but css-tree 3.2 does not read some valid modern CSS (`@supports (not (…))` in some forms, nested rules that start with a selector such as `.b &`), so one unsupported rule would have thrown away a writer's whole file.

Problems use the shared `PageProblem` shape (`file` = `estilos/<name>.css`, `line` from css-tree's positions, a Spanish `message`).

- *Alternative: a regex blacklist.* CSS escapes (`u\72l(`), comments and nesting make string matching unsafe.
- *Alternative: lightningcss.* It is a native addon, heavier to ship in the backend image, and its visitor API is less direct for "drop this declaration and report it". css-tree is pure JS and already in the lockfile (through Tailwind's tooling).

### A `styles/` area in `packages/content`, read by `readSite`

`src/styles/` holds `modules.ts` (names, order, limits), `clean.ts` (one module's text → cleaned CSS and problems) and `read.ts` (`readStyles(root, docsFiles, fileUrlOf)`: lists `estilos/`, reports unknown entries, applies the size limits, cleans and joins). It imports only from `contract` (`PageProblem`, `isImageFile`, `DOCS_DIR`). `readSite` calls `readStyles` with the file list it already has, adds the problems to `siteProblems` (so they reach the home and the reader's log through the existing path) and returns `styles` (an empty string when there is nothing) on `Site`. The API maps an empty string to `null`.

- *Alternative: read the styles in `packages/api`'s `buildSite`.* That would keep `readSite` unchanged, but the problems would need a second path to the home, and the styles would not be part of the `Site` that `readSite`'s tests cover.

### Limits

Each module is limited to 64 KiB of source, and the joined, cleaned stylesheet to 128 KiB. When a module would cross the total, it and every module after it are left out, which keeps the result a prefix of the declared order. Hand-written themes and overrides are a few KiB. The limits only stop abuse and accidental dumps (a whole framework pasted in).

## Risks / Trade-offs

- [A hostile repository restyles the reader's chrome on its own pages, for example hiding the navbar or overlaying text with `::before { content }`] → Accepted. It cannot run script, load anything from outside, read input values out, or reach any other repository's pages or `/admin`. Its text could already say anything in the page body.
- [Same-origin image requests triggered by attribute selectors] → They only reach that repository's own `docs/` images on our origin. Only the platform's logs can observe them, and writers have no access to those logs.
- [Platform class names become a contract writers depend on] → `doc-example` documents the supported classes and variables per module. Renaming one is a breaking change of the `"1"` contract, so it would be called out in a proposal.
- [css-tree's grammar lags new CSS syntax] → An unknown at-rule is removed and reported, never served. Unknown properties and values are kept (they parse generically), and the browser ignores what it doesn't know.
- [Bytes in every page] → Bounded at 128 KiB. Revisit with a cached route if real stylesheets grow.

## Migration Plan

Additive. Repositories without `estilos/` read exactly as before, and `styles` is `null` for them. Deploy backend and frontend together, as usual: an older frontend ignores the new field. Rollback is reverting the change, with no data involved.

## Open Questions

None.
