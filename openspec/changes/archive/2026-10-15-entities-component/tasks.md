## 1. Catalog reading (`packages/content`)

- [x] 1.1 Add `catalog.ts` with `readCatalog(root, declarations)`: read every `catalogo/<type>/<id>.yaml`, validate it with `entitySchema`, compute each entity's label (`etiqueta` value or id) and page (first `ficha` field in `campos` order), and keep invalid files as per-type problems; export it from `src/index.ts`. Verify with `tests/catalog.test.ts` (valid entities, label fallback, page from the first `ficha`, an invalid file kept as a problem and left out).

## 2. Page reading in two passes

- [x] 2.1 Split `readSite` into a parse pass (`parsePage` + `readHeader` for every file) and a transform pass, add the `catalog` argument and a `titleOf(pagePath)` lookup (with the folder fallback) to the transform context, and update `tests/fixtures/site.ts`. Verify the existing `tests/pages/*.test.ts` still pass.

## 3. `catalogo:` links

- [x] 3.1 Resolve `catalogo:<type>/<id>` in `resolveTarget` before the scheme test: entity with page → its reader route, entity without page → plain text with no problem, missing type or entity → broken link naming it. Verify with tests in `tests/pages/mdx.test.ts` for the three cases and that images still refuse `catalogo:`.

## 4. `<Entities>` component

- [x] 4.1 Add `pages/entities.ts` with `entitiesTable(...)`: columns from `columns`, `vista.columnas` or label plus declared fields; cells by field kind (`ref` label and link, `ficha` link with the page title, `url`/`email` links, `booleano` Sí/No, `lista` joined by commas, `objeto` pairs); rows by label; `group` blocks in `valores` order with the "Sin <field>" block last and the group column left out; the empty-type line; problems for unknown attributes, braces, unknown columns or group, and invalid entity files. Verify with `tests/pages/entities.test.ts` covering each spec scenario.
- [x] 4.2 Wire `<Entities>` into `transformPage` (block element and a lone one-line element replaced with `[SKIP, index]`; inline use reported as needing its own block; missing or unknown `type` reported with the type list and rendered as a notice), update `componentMessage` and the module comments, and allow `div.doc-entities`, `p.doc-entities-group` and `p.doc-entities-empty` in `SANITIZE_SCHEMA`. Verify with tests in `tests/pages/mdx.test.ts` rendering the example home's two tables through `siteOf`.

## 5. API wiring

- [x] 5.1 Read the catalog in `buildSite` (`packages/api/src/v1/content/reader.ts`) and pass it to `readSite`, logging its problems with the page problems. Verify with `check-types` and the `packages/api` docs tests.

## 6. Reader

- [x] 6.1 Style `.doc-entities`, its group labels and the empty line in `apps/frontend/src/styles/global.css`, and add a case to `tests/unit/features/docs/page/markdown.test.ts` showing a grouped entities block copied as a label paragraph and a GFM table. Verify with `bun run test`, Biome and `bun run tailwind:check`.

## 7. Docs and validation

- [x] 7.1 Describe `<Callout>`, `<Entities>` and `catalogo:` links in `docs/human/contenido.md` (how pages are written; it still says the platform offers no component) and update `VISION.md`'s pending list, then run `check-types`, Biome and `bun run test` and confirm they pass.
