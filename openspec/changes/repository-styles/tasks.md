## 1. The `styles/` area in `packages/content`

- [x] 1.1 Add `css-tree` (and `@types/css-tree` if it has no bundled types) to `packages/content/package.json` at the version already in the lockfile, and `bun install`
- [x] 1.2 Add `src/styles/modules.ts`: `STYLES_DIR = "estilos"`, the ordered module names (`tema`, `pagina`, `controles`, `codigo`, `tablas`, `diagramas`, `imagenes`, `avisos`, `secciones`), each with the platform module it restyles (for messages and docs), and the limits (64 KiB per module, 128 KiB in total)
- [x] 1.3 Add `src/styles/clean.ts`: `cleanStyleModule(text, { file, docsFiles, fileUrlOf })` → `{ css: string | null, problems: PageProblem[] }`. It parses with css-tree (`positions: true`, `parseCustomProperty: true`, `onParseError`) and applies the design's allow-list: at-rules; `url()` and the strings of `image-set()`/`-webkit-image-set()`/`src()`, where `data:` images and fonts are kept, relative paths are resolved from `estilos/` into existing `docs/` images and rewritten with `fileUrlOf`, and anything else removes the declaration; `behavior`/`-moz-binding`; names compared with escapes decoded; every `<` written as `\3c `; whatever css-tree keeps as `Raw` removed with its rule, at-rule or declaration. Problem messages are in Spanish, with the line
- [x] 1.4 Add `src/styles/read.ts`: `readStyles(root, docsFiles, fileUrlOf)` → `{ css: string, problems: PageProblem[] }`. It lists `estilos/` (missing folder → empty, no problem), reports every unknown entry naming the modules, enforces the per-module and total limits (a module past the total is left out with every module after it), cleans each module in order and joins them
- [x] 1.5 Tests in `packages/content/tests/styles/clean.test.ts`, one per rule of the `content-styles` spec scenarios:
  - `@import` and an unknown at-rule removed with their line; allowed at-rules kept, nested ones included
  - an external, a protocol-relative and a `javascript:` URL removed; a `data:image/png` and a `data:font/woff2` kept; a relative path to an existing `docs/` image rewritten; one to a missing file, a non-image or a path outside `docs/` removed
  - a URL inside a custom property removed; strings in `image-set()` checked like URLs
  - `behavior` removed; `</style>` inside a string escaped, and the output never contains `<`
  - an unreadable fragment removed with its line while the rest is kept; comments dropped
- [x] 1.6 Tests in `packages/content/tests/styles/read.test.ts` over a temporary folder: no `estilos/` gives an empty stylesheet and no problem; modules joined in the declared order whatever the file system order; `tables.css` and a subfolder reported and ignored; a module over 64 KiB left out; a module crossing the 128 KiB total left out with the ones after it
- [x] 1.7 Update `tests/structure.test.ts`: `styles` is an area, `styles` may import only `contract`, and `pages` may also import `styles`, with a case that fails when `styles/` imports `pages/`

## 2. `Site.styles` from `readSite`

- [x] 2.1 In `packages/content/src/pages/site.ts`, call `readStyles(root, files, routes.fileUrlOf)` with the `docs/` file list `readSite` already reads, push its problems into `siteProblems` (so they hang on the home), and add `styles: string` to `Site`
- [x] 2.2 Export what `packages/api` needs (at least the `Site` type change; `readStyles` only if the API calls it) from `src/index.ts`
- [x] 2.3 Tests in `packages/content/tests/pages/site.test.ts`: a repository with `estilos/tema.css` gets its cleaned CSS on `Site.styles`; a style problem is listed on the home's problems and in `Site.problems`; a repository without `estilos/` has `styles: ""` and no new problem

## 3. API

- [x] 3.1 Add `styles: z.string().nullable().describe(...)` to `docsOutput.page` (`packages/api/src/v1/docs/output.ts`) and map `read.site.styles` in `handler.ts` (an empty string becomes `null`); update the `page` procedure's OpenAPI description to mention it
- [x] 3.2 Tests in `packages/api/tests/v1/docs/handler.test.ts`: a page of a repository with styles carries them, the same for two of its pages; a repository without styles gives `null`

## 4. Reader

- [x] 4.1 `apps/frontend/src/layouts/Docs.astro` takes an optional `styles` prop (`string | null`) and renders `<style is:inline set:html={styles} />` after the page content inside the swapped `<body>` when it is set, with a comment on why it is unlayered and after the platform's stylesheet
- [x] 4.2 `apps/frontend/src/pages/[repo]/[...path].astro` passes `page.styles`; the "Todos" home (`pages/index.astro`) and every other `Docs` user pass nothing

## 5. Content repository docs

- [x] 5.1 Add a page to `doc-example/docs/repository/` on custom styles: the `estilos/` folder, the module names and what each restyles, the order and "later wins", the theme variables `tema.css` can set in `:root` and `.dark` (named after `apps/frontend/src/styles/theme.css`), the main classes per module (named after `styles/doc/*.css`), what the cleaning removes, the limits, and where the problems show (the menu already lists the whole `repository` folder), with a `files` entity for `estilos/*.css` (`catalogo/files/styles.yaml`) and `estilos/` in the tree and the contract names table of `docs/repository/index.mdx`
- [x] 5.2 Add `estilos/<módulo>.css` to the files table of `doc-example/AGENTS.md` and to `doc-example/.agents/skills/documentation/references/contract-names.md`, and mention `estilos/` among the fixed Spanish names in `doc-example/skills/doc-writing/SKILL.md`

## 6. Project docs and validation

- [x] 6.1 Update the `packages/content` description in `AGENTS.md`'s project map and in `.agents/skills/stack/references/workspaces.md` (including its "`packages/content` layout" section with the `styles/` area and its dependency direction); add a line on repository styles to the reader bullet of `references/frontend/navigation-and-layouts.md`
- [x] 6.2 Run `bun run check-types`, `bun run check`, `bun run tailwind:check` and `bun run test`, and fix what they report (the 7 `git/hosting` and `git/browse` failures also fail on the previous commit with the local Bun 1.3.14, unrelated to this change)
