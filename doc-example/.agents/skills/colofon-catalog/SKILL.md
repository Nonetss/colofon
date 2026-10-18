---
name: colofon-catalog
description: The catalog/ folder of a doc platform content repository, its structured data as types and entities. A decision guide for data vs page, finding the site's own types, writing a _type.yaml (keys, field kinds, title_field, view.columns) and an entity (id, YAML quoting, source/updated, refs and pages), and listing them on pages with <Entities>. Use before adding or changing a type, a field or an entity, before writing a table of repeated data on a page, and when the platform reports an entity or a type.
---

# Catalog (`catalog/`)

One folder per type (`catalog/<type>/`), its declaration in `_type.yaml`,
one entity per `.yaml` file whose name is its id. The platform knows no type:
every site declares its own, so the tables of repeated data on its pages are
entities rendered with `<Entities>`, never hand-written. The site's types are
whatever `catalog/*/_type.yaml` declares; what each type's ids are and where
its data is read from, when no `description` says it, is in `AGENTS.md`
(«Este sitio»). The contract is explained in the guide's `data/types`,
`data/entities` and `data/reader` pages; this skill is how **you** write
types and entities well. The repository as a whole is in the
`colofon-documentation` skill.

## 1. Philosophy

**Data in the catalog, explanation on a page.**

- A fact that repeats with the same shape (every machine has a hostname, a
  role and an address) is an **entity**; why it is so and how to use it is a **page**
  that cites it.
- An entity is **one line of a reference table**: short values, one fact per
  field. A field that needs a paragraph belongs on the page.
- Every field earns its place by a column someone reads, a `group`, or a link.
- **The catalog mirrors what it describes.** An entity that no longer
  matches its source (`source`) is a bug, like a stale page.

## 2. Data or page?

| You have… | Put it in |
| --- | --- |
| A new thing of a kind the site already lists (a machine, a service) | A new entity of its type, cited from the page that explains it |
| How to use that thing, its traps, its history | A page, which the entity links (a `page` field, when the type has one) |
| A list of things with the same fields that has no type yet | A new type, only when no existing one fits (`references/writing-a-type.md`) |
| A one-off fact | The page's prose |

## 3. Where to look

| Task | Read |
| --- | --- |
| Which types the site has and what each holds | `catalog/*/_type.yaml` (their `description`s) and `AGENTS.md` («Este sitio») |
| Writing or changing a `_type.yaml`: keys, field kinds, `title_field`, `view.columns` | [writing-a-type.md](references/writing-a-type.md) |
| Writing an entity: id, quoting, `source`/`updated`, `ref` and `page` | [writing-an-entity.md](references/writing-an-entity.md) |
| Listing entities on a page with `<Entities>`, citing and linking them | [entities-tables.md](references/entities-tables.md) |

## 4. Always true

- **Declare before use.** A field goes in the `_type.yaml` before any entity
  uses it, with a `description` when it is not obvious.
- **One entity per file**; the file name is the id: lowercase, digits and
  hyphens, `.yaml` (never `.yml`). Field names are lowercase with
  underscores, starting with a letter.
- Text containing `: `, or starting with `<`, `[` or `{` (and the other YAML
  traps), goes **between quotes** (`tag: "<Callout>"`).
- **`source` and `updated`** on every entity: where its data was read
  from (`manual` when written by hand) and the date it was last checked
  there.
- A `page` field points at the page that explains the entity; keep it
  right when pages move.
- After changing a `_type.yaml`, **every entity of the type must still
  validate**.
- **A table of reference data on a page is `<Entities>`**, never typed by
  hand (`colofon-docs` skill).
- Every `icon` is a Lucide icon name the platform knows.
- Ids, field names and enum values are the site's own: never rename an
  existing one, and follow the language the existing ones use. Values meant
  to be read are in the site's prose language. Contract keys (`name`,
  `fields`, `type`…) are fixed.
- **No secret** in any entity, not even provisionally.

## 5. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Two entities in one file, or a list of things in one entity | The platform reads one entity per file; the table loses rows |
| A field used before its `_type.yaml` declares it | The entity fails its type and drops out of every table |
| A new type when an existing one fits | Two tables of the same thing; pick the type, add a field if needed |
| A paragraph as a field value | The table becomes unreadable; the explanation goes on the page |
| A new required field without filling every entity | Every old entity fails and leaves the tables |
| Unquoted `tag: <Callout>` or `purpose: La vía: Pangolin` | YAML misreads it; the entity is reported |
| `source` or `updated` declared in `fields` | Reserved: every entity has them; the declaration is rejected |
| A hand-typed table of entities on a page | It goes stale the next time an entity changes |

## 6. Before finishing

- The editor marks nothing in the files you touched (`yaml.schemaStore.url`
  in `.vscode/settings.json`).
- Every `ref` and every `page` (`page`) points at an entity or a page that
  exists.
- Every entity of a changed type still validates; every `<Entities>` that
  names a column you renamed or removed is updated.
- New entities have their `source` and today's `updated`, and the page
  that explains them cites them (a header field or a link).
