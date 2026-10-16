# The header

The YAML block every page starts with: the five fields every page of every
site has, plus the ones this site declares in `doc.config.yaml` under
`cabecera`. The contract is `docs/pages/header.mdx`; the common fields are the
`header-fields` entities in `catalogo/header-fields/`.

## A real header

`docs/repository/menu.mdx`:

```mdx
---
titulo: El menú
descripcion: menu.yaml decide qué muestra la barra lateral, agrupado y ordenado, estén donde estén guardadas las páginas
files: [menu]
orden: 2
actualizado: 2026-10-15
---
```

`docs/diagrams/graphs.mdx` cites diagram types too:

```mdx
---
titulo: Grafos
descripcion: Cómo escribir diagramas de flujo, máquinas de estados, árboles, organigramas y grafos de dependencias dando solo las piezas y sus flechas, y qué avisa la plataforma de cada uno
files: [diagram-file]
diagram_types: [flowchart, state, tree, org-chart, dependency]
orden: 2
actualizado: 2026-10-16
---
```

## The common fields

| Field | Kind | In this guide |
| --- | --- | --- |
| `titulo` | `texto` | Required. Short, Spanish, a noun phrase ("La cabecera", "El menú"). If the menu sets a title for the page, it must be the same. |
| `descripcion` | `texto` | Required. One sentence that says **what the reader learns**, not "Esta página explica…". It shows under the title, on the card and in search. |
| `icono` | `texto` (Lucide name) | **Never.** Icons of the pages the menu shows go in `menu.yaml`; a different header value is reported and never shown. |
| `orden` | `numero` | On every page that is not a section's `index.mdx`: its place in its folder. |
| `actualizado` | `fecha` | The date the page was last **checked against the platform** (`YYYY-MM-DD`), not of the last edit. After six months the page shows "Revisar". |

## This site's fields

Declared in `doc.config.yaml` under `cabecera` (`documentation` skill,
`references/doc-config.md`). All optional.

| Field | Declared as | What it says |
| --- | --- | --- |
| `files` | `lista` of `ref` to `files` | The files of a content repository the page explains (`[menu]`, `[page, doc-config]`) |
| `components` | `lista` of `ref` to `components` | The page components it explains (`[callout, entities, diagram]`) |
| `diagram_types` | `lista` of `ref` to `diagram-types` | The diagram types it explains (`[flowchart, state]`) |
| `open_questions` | `lista` of `texto` | What is still unknown; a question round answers them (`/questions`) |

- The `ref` fields are **why they exist**: each id is checked against the
  catalog, the header shows the entities as links, and each entity's page
  lists this page under "Páginas que la citan". Cite the entities the page
  **explains**, not every one it mentions.
- Ids are the entity file names: `files: [doc-config]` for
  `catalogo/files/doc-config.yaml`.
- `open_questions` are closed by a question round (`documentation` skill,
  `references/question-rounds.md`), removed completely once answered.
- A field `doc.config.yaml` doesn't declare is reported ("La cabecera no
  admite `…`: solo titulo, descripcion, icono, orden, actualizado y los campos
  de cabecera de doc.config.yaml"): declare it first, or don't use it.

## What the platform does with a bad header

- A page without a valid header is still published, titled with its file
  name, and its problems are reported.
- Every field valid on its own is kept; an invalid one is dropped and
  reported with its line.
- Header YAML that doesn't parse is one problem: "La cabecera no es YAML
  válido: …".
- A bad date: "Una fecha AAAA-MM-DD (2026-10-15)".
- A title or icon that differs from the menu's: "titulo: la cabecera dice
  «…», pero manda menu.yaml («…»)".

## Checks

- `titulo` and `descripcion` present; `orden` unless it is an `index.mdx`; no
  `icono`.
- Quote a value that contains `: ` or starts with `[`, `{` and the like (same
  YAML traps as entities: `catalogo` skill, `references/writing-an-entity.md`).
- Every cited id exists in `catalogo/<type>/`.
