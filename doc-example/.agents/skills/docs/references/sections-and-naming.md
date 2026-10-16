# Sections and naming

Where a page of this guide goes, what it is called, and what moving or
renaming one drags along. The contract behind it is in `docs/pages/index.mdx`
and `docs/repository/index.mdx` ("Nombres y rutas").

## A file is a page, its path is its URL

| File | Page path | What it is |
| --- | --- | --- |
| `docs/index.mdx` | `""` | The repository's home (never a menu entry) |
| `docs/getting-started.mdx` | `getting-started` | A loose page at the top |
| `docs/repository/index.mdx` | `repository` | A section's entry page |
| `docs/repository/menu.mdx` | `repository/menu` | A page of that section |

- Every folder is a **section**, titled by its `index.mdx` (or by the folder
  name when it has none). The section's page lists its pages and subsections
  as cards after its body.
- The page path is what links, `ficha` fields (`page: repository/menu`) and
  menu entries name.

## This guide's sections

| Folder | Section (`titulo`) | Pages, by `orden` |
| --- | --- | --- |
| `docs/` (top) | Escribir documentación (home), Primeros pasos | `index.mdx`, `getting-started.mdx` |
| `docs/repository/` | El repositorio | `config` (1), `menu` (2) |
| `docs/pages/` | Páginas | `header` (1), `markdown` (2), `components` (3) |
| `docs/data/` | El catálogo | `types` (1), `entities` (2), `reader` (3) |
| `docs/diagrams/` | Diagramas | `drawn` (1), `graphs` (2), `time` (3), `concepts` (4), `charts` (5), `proportions` (6), `comparison` (7), `illustrations` (8) |
| `docs/publishing/` | Sincronización y problemas | `editor` (1), `agents` (2), `writing-agents` (3) |

## Rules

- **One folder per topic of the guide, flat:** never deeper than
  `docs/<topic>/<page>.mdx`.
- **Every folder has its `index.mdx`**, the section's entry page: what the
  topic is, and a "¿Dónde encuentro…?" table to its pages
  (`writing-a-page.md`).
- **Order within a section comes from each page's `orden`**; pages without it
  go last, then by title. `index.mdx` has no `orden`. The order of the groups
  and of the top level is `menu.yaml`'s.
- **Files and folders: lowercase, digits and hyphens**
  (`getting-started.mdx`). No accents, no spaces, no underscores. They are
  the URL and the path other pages link to. Existing names are English and
  stay as they are; the page's words are Spanish.
- **`.mdx`**, always: the platform reads `docs/**/*.mdx` only.
- **`docs/catalog/` is reserved:** the platform generates the catalog's pages
  there. A page under it is reported ("docs/catalog/ está reservada para las
  páginas que la plataforma hace del catálogo: esta ficha no se publica") and
  not published. This guide explains the catalog in `docs/data/`.
- **Images** go in an `img/` folder next to the page that uses them
  (`links.md`).

## Adding a page

1. Pick the section whose topic it is. A topic with no section is a new
   folder with its `index.mdx`.
2. Give it a header (`header.md`), with the next free `orden` of the section.
3. **Menu:** a page inside a folder the menu lists needs nothing (the folder's
   entry brings it, ordered by `orden`). A new folder or loose page needs an
   entry in its group (`documentation` skill, `references/menu.md`).
4. Link it from the section's "¿Dónde encuentro…?" table, and from the home's
   when it answers a first-time question.
5. If it explains a catalog entity, cite it in the header (`files`,
   `components`, `diagram_types`) and point the entity's `page` at it.

## Moving or renaming a page

Renaming changes the URL. In the same change, update:

| What names it | Where |
| --- | --- |
| Relative links `[…](….mdx)` | Every page under `docs/` (`grep -rn "menu.mdx" docs`) |
| `ficha` fields (`page:`) | Entities under `catalog/` |
| Menu entries | `menu.yaml`, when it names the page or its folder |
| Diagram pieces with `"page"` | `diagrams/*.json` |
| Served skill or skills text | `skills/`, `.agents/skills/`, when they cite the path |

Every one left behind is reported: a broken link shows as plain text, a
`ficha` to no page fails its entity, a menu entry to nothing is dropped.
