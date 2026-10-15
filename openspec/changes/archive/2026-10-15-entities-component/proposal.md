## Why

The platform validates each repository's catalog (`catalogo/<type>/*.yaml`), but no page can show it: `<Entities type="services" />` is reported as a component the platform does not provide, and a `catalogo:machines/docker-01` link loses its target. The example repository's home already uses both, so the catalog, the reason to declare types at all, never reaches the reader.

## What Changes

- `<Entities>` becomes the second platform component, after `<Callout>`. `<Entities type="services" group="category" columns="name,status,summary" />` renders, on the server and inside the page tree, a table of the type's valid entities: the columns from `columns` or the type's `vista.columnas` (and the label plus every declared field when neither is given), one block per value of the `group` field, rows ordered by label.
- Cells show each value by its field kind: text as written, an `enum` as its value, a `ref` as the referenced entity's label, a `ficha` as a link to that page, a `url` or `email` as a link out, a `booleano` as "Sí"/"No", a `lista` joined by commas.
- An entity's name (its `etiqueta` field, or its id) links to the entity's page — the value of the first `ficha` field its type declares — and is plain text when it has none. There are no entity pages yet.
- `catalogo:<type>/<id>` links in page text follow the same rule: the entity's page, or plain text without a link when it has none. A link to a type or entity that does not exist is a broken link, reported like a broken page link.
- An unknown `type`, a `columns` or `group` naming a field the type does not declare, an unknown attribute, an attribute in braces, and entity files that fail their type's schema are reported as page problems; the rest of the table still renders.
- The page's problems now depend on the catalog: a page with `<Entities>` is rebuilt when the repository syncs, as every page already is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-pages`: `<Entities>` is accepted and rendered as a catalog table (new requirement, and the accepted-MDX requirement no longer calls every non-`Callout` element unknown); `catalogo:` links are resolved (links and images requirement).

## Impact

- `packages/content`: reading every entity file of the catalog once per site build (validated with `entitySchema`), the `<Entities>` handler in the page transform, `catalogo:` link resolution, and the sanitizer allow-list for the table's classes. `readSite` gains the catalog as an input.
- `packages/api`: `v1/content/reader.ts` passes the declarations' types to `readSite`; the `v1.docs.page` output does not change (tables are part of the existing hast tree).
- `apps/frontend`: styles for the entities table and its group labels in `styles/global.css`; "Copiar en Markdown" writes the tables as GFM tables.
- Content repositories: `<Entities>` and `catalogo:` links start rendering; no content change is needed.
