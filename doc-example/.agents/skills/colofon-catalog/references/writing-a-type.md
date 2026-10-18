# Writing a type

A type is a folder `catalog/<type>/` with its declaration `_type.yaml`. The
contract is the guide's `data/types` page, whose «Referencia» lists every
field kind. `_type.yaml` is a **declaration**: while it is
broken, the platform keeps its last valid version and nothing that depends on
it changes.

## Before adding one

- Look for an existing type that fits (`ls catalog/` and each
  `_type.yaml`'s `description`); create one only when none does. A missing
  field is a new field, not a new type.
- A new type is a new kind of thing the site lists as a table. Ask the user
  before adding one when the request did not name it.

## A declaration

```yaml
# catalog/components/_type.yaml (from the guide)
name: Componente
plural: Componentes
icon: component
description: Los componentes que una página puede usar, el único JSX que lee la plataforma. Cada uno va en un bloque propio
title_field: tag

fields:
  tag:
    type: text
    description: Cómo se escribe en una página
  purpose:
    type: text
    description: Qué muestra
  attributes:
    type: list
    description: Los atributos que acepta, siempre como cadenas literales
    of:
      type: object
      fields:
        name: { type: text }
        required: { type: boolean }
        meaning: { type: text }
  page:
    type: page
    optional: true
    description: La página que lo explica

view:
  columns: [tag, purpose]
```

## Type keys

| Key | What it is |
| --- | --- |
| `name` | Required. Singular name, Spanish ("Componente"). |
| `plural` | Required. Plural name ("Componentes"); the catalog page's title and the empty-table text. |
| `icon` | Optional. A Lucide icon name. |
| `description` | Optional, always written here. What goes in the type and **what its id is** ("El id es el tipo tal como se escribe en `type`"). |
| `title_field` | Optional. The declared field shown as each entity's name, sorted and linked in tables; without it, the id. Use it when the id is not what a reader recognises (`path`, `tag`, `name`). |
| `fields` | Required. The fields, at least one, each with its `type`. |
| `view.columns` | Optional. The type's table columns, in order: declared fields plus `id`, `source`, `updated`. Also the default of every `<Entities>` without `columns`. |

Anything else is rejected. The type id is the folder name: lowercase, digits
and hyphens ("El nombre de un tipo va en minúsculas, sin acentos y con
guiones").

## Field keys

| Key | What it is |
| --- | --- |
| `type` | Required. The field kind (below). |
| `optional` | Optional. `true` if it may be missing; every field is required otherwise. |
| `description` | Optional, but on every field that is not obvious: the editor shows it as help and agents read it. Put the enum's meaning here (`"declaration: …; content: …"`). |
| `values` | Required for `enum`: the values, at least one. |
| `label` | Optional. How the reader names the field (column headers, the entity page, the page header); without it, its name. Not to be confused with the type's `title_field`. |
| `to` | Required for `ref`: the target type's folder name. |
| `of` | Required for `list`: the field that repeats (a whole field declaration). |
| `fields` | Required for `object`: its named fields. |

Field names: lowercase, digits and underscores, starting with a letter
(`public_ip`). `source` and `updated` can't be declared: "`source` no se
puede declarar: toda entidad lo admite sin declararlo".

## Field kinds

| Family | Kinds | Extra key |
| --- | --- | --- |
| scalar | `text` (one non-empty line), `number`, `integer`, `boolean` (shown "Sí"/"No"), `date` (`YYYY-MM-DD`), `url`, `email`, `ip` (v4 or v6) | — |
| choice | `enum` | `values` |
| reference | `ref` (an entity id of type `to`, shown as its `title_field`, linked), `page` (a page path under `docs/` without `.mdx`, shown as a link with its title) | `to` for `ref` |
| composite | `list` (shown joined by commas), `object` (shown as `name: value` pairs) | `of`, `fields` |

Kinds nest: a `list` of `object`, each with another `list`, is valid. The
same kinds declare `doc.config.yaml`'s `header` fields.

## Choosing a kind

| The value is… | Kind |
| --- | --- |
| One of a fixed set you will group or filter by | `enum`, values short ids (`declaration`, `physical`) |
| Another entity | `ref`, never its name as `text` |
| The page that explains this entity | `page` (often named `page`) |
| Several of the same | `list` with `of` |
| A small record (an attribute with name, required, meaning) | `object`, usually in a `list` |
| A date the data was true | `date` |

## Changing a type

- After changing a `_type.yaml`, the existing entities must still validate: a
  new required field is filled in every one of them in the same change (or
  added `optional: true`).
- Renaming or removing a field: update every entity, the `title_field`, the
  `view.columns` and every `<Entities columns=… group=…>` on the pages
  (`grep -rn 'type="<type>"' docs`).
- A bad `to:` is reported on the declaration: "…: `to: x` no es ningún tipo de
  catalog/ (hay: …)". A `title_field` or column that is no field: "`x` no es
  ninguno de los campos".
