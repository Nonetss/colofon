# The header

The YAML block every page starts with: the five fields every page of every
site has, plus the ones the site declares in `doc.config.yaml` under
`header`. The contract is the guide's `pages/header` page.

## An example

```mdx
---
title: El DNS
description: Qué resuelve cada servidor DNS de casa, cómo se reparten las zonas y dónde se cambia un registro
machines: [opnsense, adguard-01]
order: 3
updated: 2026-10-15
---
```

`machines` here is a header field the site declared under `header`; the
other five are the common ones.

## The common fields

| Field | Kind | How to fill it |
| --- | --- | --- |
| `title` | `text` | Required. Short, Spanish, a noun phrase ("El DNS", "Restaurar una VM"). If the menu sets a title for the page, it must be the same. |
| `description` | `text` | Required. One sentence that says **what the reader learns or can do**, not "Esta página explica…". It shows under the title, on the card and in search. |
| `icon` | `text` (Lucide name) | **Never.** Icons of the pages the menu shows go in `menu.yaml`; a different header value is reported and never shown. |
| `order` | `number` | On every page that is not a section's `index.mdx`: its place in its folder. |
| `updated` | `date` | The date the page was last **checked against what it describes** (`YYYY-MM-DD`), not of the last edit. After six months the page shows "Revisar". |

## The site's fields

Read `header` in `doc.config.yaml` before writing a header: it lists every
extra field the site's pages accept, each with its kind and a `description`
that says what it is for (`colofon-documentation` skill, `references/doc-config.md`).
The «Este sitio» section of `AGENTS.md` says which pages use which, when it
is not obvious.

- A field that is a `ref` (or a `list` of `ref`) **cites catalog
  entities**: each id is checked against the catalog, the header shows the
  entities as links, and each entity's page lists this page under "Páginas
  que la citan". Cite the entities the page **is about**, not every one it
  mentions.
- Ids are the entity file names: `machines: [docker-01]` for
  `catalog/machines/docker-01.yaml`.
- A field `doc.config.yaml` doesn't declare is reported ("La cabecera no
  admite `…`: solo title, description, icon, order, updated y los campos
  de cabecera de doc.config.yaml"): declare it first, or don't use it.

## Open questions

When the site declares an `open_questions` header field (a `list` of
`text`), what a page can't yet say goes there, one question per item,
instead of a guess in the prose:

```yaml
open_questions:
  - ¿Qué VM usa la IP 192.168.1.40?
```

A question round closes them (`colofon-documentation` skill,
`references/question-rounds.md`): each answered question is removed
completely. A site without that field writes a "_Pending: …_" line in the
text instead, and the round finds those too.

## What the platform does with a bad header

- A page without a valid header is still published, titled with its file
  name, and its problems are reported.
- Every field valid on its own is kept; an invalid one is dropped and
  reported with its line.
- Header YAML that doesn't parse is one problem: "La cabecera no es YAML
  válido: …".
- A bad date: "Una fecha AAAA-MM-DD (2026-10-15)".
- A title or icon that differs from the menu's: "title: la cabecera dice
  «…», pero manda menu.yaml («…»)".

## Checks

- `title` and `description` present; `order` unless it is an `index.mdx`; no
  `icon`.
- Quote a value that contains `: ` or starts with `[`, `{` and the like (same
  YAML traps as entities: `colofon-catalog` skill, `references/writing-an-entity.md`).
- Every cited id exists in `catalog/<type>/`.
