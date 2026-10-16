## Why

Every content repository is read with the same look: the platform's theme and the reader's styles. A repository has no way to bring its own brand colours or to restyle one piece of its pages, such as its tables or its callouts. The platform's styles are now split into one module per piece of the page (`apps/frontend/src/styles/theme.css` and `styles/doc/*.css`). That lets a repository restyle the same pieces, module by module, without the platform giving up any of its own styles.

Content repositories may be written and hosted by people outside the platform's team. A repository's CSS therefore cannot be served as written. CSS can load resources from anywhere and, through attribute selectors, leak what a page shows. The platform must clean it before applying it.

## What Changes

- **`estilos/` in the content repository (optional).** A repository MAY hold an `estilos/` folder with one CSS file per platform style module, named in Spanish after it: `tema.css` (the theme tokens), `pagina.css`, `controles.css`, `codigo.css`, `tablas.css`, `diagramas.css`, `imagenes.css`, `avisos.css` and `secciones.css`. Every file is optional. Any other entry in `estilos/` is reported and ignored. This is an additive part of contract `"1"`, so `plataforma` stays `"1"`.
- **Cleaned before use.** The backend reads the modules with the rest of the site, once per checkout, and turns them into one cleaned stylesheet in module order. The cleaning:
  - keeps only an allow-list of at-rules (no `@import`);
  - keeps no external or absolute URL. The only `url()`s allowed are `data:` images and fonts, and relative paths to the repository's own images under `docs/`, which are rewritten to the reader's file route;
  - drops legacy script-bearing properties;
  - compares names with their CSS escapes decoded;
  - never lets `<` reach the output, so the stylesheet can be inlined in the HTML;
  - removes what it cannot parse, keeping the rest of the file;
  - enforces size limits.

  Whatever it removes is reported as a site problem on the repository's home, with file, line and message in Spanish.
- **Applied over the platform's styles, only on that repository's pages.** `v1.docs.page` gains `styles` (the cleaned stylesheet, or `null`). The reader puts it after the platform's stylesheet on that repository's pages, so where both set the same thing the repository wins, tokens included. Other repositories' pages, the "Todos" home and `/admin` never get it.
- **`packages/content` gains a `styles/` area** that reads and cleans the modules. It imports only from `contract`, and `pages` may import from it.
- **`doc-example` documents it**: a page on custom styles listing the modules, what each one covers and the theme variables. The contract names reference also gets `estilos/`.

## Capabilities

### New Capabilities

- `content-styles`: the optional `estilos/` folder of a content repository: its module names and order, how they are read, cleaned and limited, and how their problems are reported.

### Modified Capabilities

- `content-contract`: the repository layout gains the optional `estilos/` folder.
- `documentation-reader`: `v1.docs.page` returns the repository's cleaned stylesheet, and the reader applies it over the platform's styles only on that repository's pages.
- `content-package-structure`: a `styles/` area joins the source root. It imports only from `contract`, and `pages` may import from it.

## Impact

- `packages/content`: the new `src/styles/` (module names, reading and cleaning), `pages/site.ts` (`Site.styles`, style problems on the home), `src/index.ts`, the structure test and the new tests under `tests/styles/`. New dependency: `css-tree` (pure JS, already in the lockfile through Tailwind).
- `packages/api`: `v1/docs/output.ts` and `handler.ts` (`styles` on `page`), plus tests.
- `apps/frontend`: `layouts/Docs.astro` takes the stylesheet and inlines it after the page content, and `pages/[repo]/[...path].astro` passes it.
- `doc-example`: the new styles page and the contract names reference.
- `AGENTS.md` project map and the `stack` skill (`references/workspaces.md`): `packages/content` now also cleans repository styles.
- No database schema or migration change.
