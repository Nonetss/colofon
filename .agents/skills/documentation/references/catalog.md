# Catalog

How types and entities are written is explained in the guide:
`docs/catalog/types.mdx`, `docs/catalog/entities.mdx` and, for what the reader
makes of them, `docs/catalog/reader.mdx`. This reference holds how **this
site's** catalog is used.

## This site's types

The catalog describes the platform's content contract, so the guide's
reference tables are data, not hand-written tables:

| Type | One entity per… | Label |
| --- | --- | --- |
| `files` | File or folder a content repository may hold (`doc.config.yaml`, `menu.yaml`…) | `path` |
| `field-kinds` | Field kind (`texto`, `ref`, `lista`…); the id is the kind | the id |
| `header-fields` | Field every page header has (`titulo`…); `kind` points at `field-kinds` | the id |
| `components` | Page component (`<Callout>`…), with its attributes as a list of objects | `tag` |

Each type shows a different part of the contract working: `files` has an
`enum` and a `ficha`, `header-fields` a `ref`, `components` a `lista` of
`objeto`.

## When the platform changes

- A new file, field kind, header field or component of the contract is a new
  entity, and its page in `docs/` explains it.
- `page` (a `ficha`) points at the page that explains the entity; keep it
  right when pages move.
- `fuente: manual` and `actualizado` (the date it was checked against the
  platform) on every entity.

## Rules

- Declare a field in the `_tipo.yaml` before using it, with a `descripcion`
  when it is not obvious.
- One entity per file; the file name is the id.
- Text containing `: `, or starting with `<`, `[` or `{`, goes between quotes
  (`tag: "<Callout>"`).
- After changing a `_tipo.yaml`, every entity of the type must still validate.
