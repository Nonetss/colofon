# Keeping in step with the platform

This catalog mirrors the platform's content contract. When the platform
(its own repository, `packages/content`) changes what it reads, the catalog and
the page that explains it change in the same change. An entity that
describes something the platform no longer does is a bug.

## Where each type's truth lives

| Type | Source on the platform (`packages/content/src/`) |
| --- | --- |
| `files` | `load.ts`, `source.ts` (what is read), the OpenSpec `content-contract` spec |
| `field-kinds` | `meta-schema.ts` (`SCALAR_FIELD_KINDS` and the `enum`/`ref`/`lista`/`objeto` shapes), `entity-schema.ts` (how each is checked) |
| `header-fields` | `meta-schema.ts` (`PAGE_HEADER_FIELDS`), `pages/header.ts` |
| `components` | `pages/transform.ts` (`Callout` types and attributes, `Diagram`), `pages/entities.ts` (`Entities` attributes) |
| `diagram-types` | `pages/diagram-types/<type>.ts` (keys, variants, budget), `pages/diagrams.ts` |

Read the code to check a fact; never edit it from here.

## What a platform change means here

| The platform… | In `catalog/` | In `docs/` and elsewhere |
| --- | --- | --- |
| Adds a file, field kind, header field, component or diagram type | A new entity, `fuente: manual`, today's `actualizado`, `page` at its explaining page | The page explains it and cites the entity in its header; a diagram type also gets its family section, a `<type>-<topic>` example and a `diagrams` reference |
| Changes one (a new attribute, a new enum value, a new budget) | Update the entity's fields and `actualizado` | Update the page's example, keys table and "what gets reported" |
| Removes one | Delete the entity | Remove it from the page and from every header that cites it |
| Adds a property every entity of a type should show | A new field in `_type.yaml` (`opcional: true` until filled), then fill every entity | Add the column to the `<Entities>` that need it |
| Changes a rule a served skill states | — | `skills/guide/SKILL.md` in the same change (`skills` skill); a rule of the platform's own `doc-writing` changes in the platform's repository |

## Checking a type against the platform

1. List the entities: `ls catalog/<type>/`.
2. List what the platform has (the constant or folder above).
3. Every item on one side has its counterpart on the other; every field value
   (attributes, values, budgets, variants) matches the code.
4. Bump `actualizado` on every entity you checked, changed or not.

## Moving pages

`page` (a `ficha`) names a page path. When a page under `docs/` moves or is
renamed, update every `page:` that names it
(`grep -rn "^page: <old/path>$" catalog`); a `ficha` to no page fails its
entity, which then drops out of every table.
