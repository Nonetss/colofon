# Contract names and the site's names

The platform reads a fixed set of names, all in English: files and folders,
the keys and fixed values of the YAML files, a diagram's keys and the
components' attributes. They must be written exactly so, or the content stops
validating. Everything else is the site's own.
This is contract 2 (`contract: "2"` in `doc.config.yaml`); a repository still
on contract 1 (`plataforma: "1"`) writes the same keys in Spanish, listed in
the guide's `repository/contract-1` page. The source is the guide's `repository` page
("Nombres del contrato y nombres tuyos").

## The contract's names

| Where | Contract names |
| --- | --- |
| Files and folders | `doc.config.yaml`, `menu.yaml`, `docs/`, `index.mdx`, `catalog/`, `_type.yaml`, `diagrams/`, `styles/` and its modules (`theme.css`, `page.css`, `controls.css`, `code.css`, `tables.css`, `diagrams.css`, `images.css`, `callouts.css`, `sections.css`), `skills/` |
| `doc.config.yaml` | `name`, `description`, `contract`, `header` |
| `menu.yaml` | `sections`, `title`, `icon`, `description`, `pages`, `path` |
| `_type.yaml` | `name`, `plural`, `icon`, `description`, `title_field`, `fields`, `view`, `columns` |
| A field | `type`, `optional`, `description`, `label`, `values`, `to`, `of`, `fields` |
| Field kinds | `text`, `number`, `integer`, `boolean`, `date`, `url`, `email`, `ip`, `page`, `enum`, `ref`, `list`, `object` |
| Every page header | `title`, `description`, `icon`, `order`, `updated` |
| Every entity | `source`, `updated` |
| A diagram (JSON) | `type`, `variant`, `title`, `desc` and its form's keys: `width`, `height`, `nodes`, `edges`, `zones`, `notes` drawn by hand, `items` and `links` in a chain, its type's keys with a `type` (`colofon-diagrams` skill) |
| Links | `catalog:` followed by a type, or a type and an id |
| Component names and attributes | `Callout` (`type`, `title`), `Entities` (`type`, `columns`, `group`), `Diagram` (`id`) |

The guide's "Referencia" pages list them as tables: `catalog/field-kinds`,
`catalog/header-fields`, `catalog/components`, `catalog/files`,
`catalog/diagram-types`.

## The site's names

Everything the contract doesn't fix belongs to the site, which picks it
once and keeps it:

| What | Where the site's names are |
| --- | --- |
| Type ids (folders of `catalog/`) and their field names | `catalog/*/_type.yaml` |
| Enum values | The `values` of each `enum` field |
| Header fields | `header` in `doc.config.yaml` |
| Folders under `docs/`, file names, entity and diagram ids | The tree itself |
| Titles, values meant to be read, prose, menu groups | The pages, entities and `menu.yaml` |

Prose, titles and values meant to be read are Spanish, like the platform's
own interface. The language of ids, field names and folders is the site's
choice, written down in `AGENTS.md`, «Este sitio» (often English). Whatever
it is, an existing name keeps its language.

## Traps

| Trap | Why |
| --- | --- |
| `catalog/` (contract, the data) vs a section of `docs/` about the data | `docs/catalog/` is reserved for the generated pages: never create it |
| `type` in `<Entities type="…">` and `<Callout type="…">` vs a field's `type` | The attribute names a catalog type or a callout kind; in a YAML field, `type` is the field kind |
| `title_field` (a type's: which field names each entity) vs `label` (a field's: how the reader names it) | Two keys, two places; a site field may also be named `label` or `tag` |
| A Spanish key (`titulo`, `campos`, `tipo: texto`) | That is contract 1: in a `contract: "2"` repository it is an unknown key |
| A site field named `page` (a `page`) vs `pages` (a menu key) | Same idea, different owners |
| `.yml` | Only `.yaml` is read |

## Rule

Never translate a contract name, and never rename one of the site's
existing names: ids, fields and folders are cited by links, `ref`s, `page`s,
headers, menu entries and diagrams, and every one would break.
