---
name: catalogo
description: The catalogo/ folder of this content repository, the catalog that describes the doc platform's content contract as data (files, field-kinds, header-fields, components, diagram-types). A decision guide for data vs page, this site's five types and why each field exists, writing a _tipo.yaml (keys, field kinds, etiqueta, vista.columnas) and an entity (id, YAML quoting, fuente/actualizado, refs and fichas), listing them on pages with <Entities>, and keeping them in step when the platform changes. Use before adding or changing a type, a field or an entity, before writing a reference table on a page, and when the platform adds or changes part of its contract.
---

# Catalog (`catalogo/`)

One folder per type (`catalogo/<type>/`), its declaration in `_tipo.yaml`,
one entity per `.yaml` file whose name is its id. The platform knows no type:
every site declares its own. **This site's catalog describes the platform's
own contract**, so the guide's reference tables (every file, field kind,
header field, component and diagram type) are data rendered with
`<Entities>`, never hand-written. How types and entities are written in any
site is explained in the guide (`docs/catalog/types.mdx`,
`docs/catalog/entities.mdx`, `docs/catalog/reader.mdx`); this skill is how
**this site's** catalog is kept. The repository as a whole is in the
`documentation` skill.

## 1. Philosophy

**Data in the catalog, explanation on a page.**

- A fact that repeats with the same shape (every file has a path, a kind and
  a purpose) is an **entity**; why it is so and how to use it is a **page**
  that cites it.
- An entity is **one line of a reference table**: short values, one fact per
  field. A field that needs a paragraph belongs on the page.
- Every field earns its place by a column someone reads, a `group`, or a link.
- **The catalog is the contract's mirror.** An entity that describes
  something the platform no longer does is a bug, like a stale page.

## 2. Data or page?

| You have… | Put it in |
| --- | --- |
| A new part of the contract (file, field kind, header field, component, diagram type) | A new entity of its type, plus its explaining page |
| How to write or use that part, its traps, what gets reported | The page the entity's `page` points at |
| A list of things with the same fields that has no type yet | A new type, only when none of the five fits (`references/writing-a-type.md`) |
| A one-off fact | The page's prose |

## 3. Where to look

| Task | Read |
| --- | --- |
| Which type holds what, each field and why it exists, labels and columns | [this-site-types.md](references/this-site-types.md) |
| Writing or changing a `_tipo.yaml`: keys, field kinds, `etiqueta`, `vista.columnas` | [writing-a-type.md](references/writing-a-type.md) |
| Writing an entity: id, quoting, `fuente`/`actualizado`, `ref` and `ficha` | [writing-an-entity.md](references/writing-an-entity.md) |
| Listing entities on a page with `<Entities>`, citing and linking them | [entities-tables.md](references/entities-tables.md) |
| The platform added, changed or removed part of its contract | [keeping-in-step.md](references/keeping-in-step.md) |

## 4. Always true

- **Declare before use.** A field goes in the `_tipo.yaml` before any entity
  uses it, with a `descripcion` when it is not obvious.
- **One entity per file**; the file name is the id: lowercase, digits and
  hyphens, `.yaml` (never `.yml`). Field names are lowercase with
  underscores, starting with a letter.
- Text containing `: `, or starting with `<`, `[` or `{` (and the other YAML
  traps), goes **between quotes** (`tag: "<Callout>"`).
- **`fuente: manual` and `actualizado`** (the date it was checked against the
  platform) on every entity.
- `page` (a `ficha`) points at the page that explains the entity; keep it
  right when pages move.
- After changing a `_tipo.yaml`, **every entity of the type must still
  validate**.
- **A table of reference data on a page is `<Entities>`**, never typed by
  hand (`docs` skill).
- Every `icono` is a Lucide icon name the platform knows.
- Ids, field names and enum values are this site's own and already English:
  never rename them; values meant to be read (`purpose`, `meaning`) are
  Spanish. Contract keys (`nombre`, `campos`, `tipo`…) are fixed.
- **No secret** in any entity, not even provisionally.

## 5. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Two entities in one file, or a list of things in one entity | The platform reads one entity per file; the table loses rows |
| A field used before its `_tipo.yaml` declares it | The entity fails its type and drops out of every table |
| A new type when an existing one fits | Two tables of the same thing; pick the type, add a field if needed |
| A paragraph as a field value | The table becomes unreadable; the explanation goes on the page |
| A new required field without filling every entity | Every old entity fails and leaves the tables |
| Unquoted `tag: <Callout>` or `purpose: La vía: Pangolin` | YAML misreads it; the entity is reported |
| `fuente` or `actualizado` declared in `campos` | Reserved: every entity has them; the declaration is rejected |
| A hand-typed table of these entities on a page | It goes stale the next time the platform changes |

## 6. Before finishing

- The editor marks nothing in the files you touched (`yaml.schemaStore.url`
  in `.vscode/settings.json`).
- Every `ref` and every `page` (`ficha`) points at an entity or a page that
  exists.
- Every entity of a changed type still validates; every `<Entities>` that
  names a column you renamed or removed is updated.
- New entities have `fuente: manual` and today's `actualizado`, and their
  explaining page cites them in its header.
