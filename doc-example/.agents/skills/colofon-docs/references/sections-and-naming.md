# Sections and naming

Where a page goes, what it is called, and what moving or renaming one drags
along. The contract behind it is in the guide's `pages` and `repository`
pages ("Nombres y rutas").

## A file is a page, its path is its URL

| File | Page path | What it is |
| --- | --- | --- |
| `docs/index.mdx` | `""` | The repository's home (never a menu entry) |
| `docs/getting-started.mdx` | `getting-started` | A loose page at the top |
| `docs/network/index.mdx` | `network` | A section's entry page |
| `docs/network/dns.mdx` | `network/dns` | A page of that section |

- Every folder is a **section**, titled by its `index.mdx` (or by the folder
  name when it has none). The section's page lists its pages and subsections
  as cards after its body.
- The page path is what links, `ficha` fields (`page: network/dns`) and menu
  entries name.

## The site's sections

The sections that exist are the folders of `docs/`; how they show is
`menu.yaml`; what each one is for, and where a new topic goes, is in the
«Este sitio» section of `AGENTS.md` and each section's `index.mdx`. Read them
before adding a page: a page goes in the section whose topic it is, and each
thing is explained in one place and linked from the rest.

## Rules

- **One folder per topic, shallow:** `docs/<topic>/<page>.mdx`. A subfolder
  (`docs/<topic>/<subtopic>/`, with its own `index.mdx`) only when a subtopic
  has several pages of its own; never deeper than that.
- **Every folder has its `index.mdx`**, the section's entry page: what the
  topic is, and a "¿Dónde encuentro…?" table to its pages
  (`writing-a-page.md`).
- **Order within a section comes from each page's `orden`**; pages without it
  go last, then by title. `index.mdx` has no `orden`. The order of the groups
  and of the top level is `menu.yaml`'s.
- **Files and folders: lowercase, digits and hyphens**
  (`getting-started.mdx`). No accents, no spaces, no underscores. They are
  the URL and the path other pages link to, so existing names stay as they
  are; the page's words are Spanish.
- **`.mdx`**, always: the platform reads `docs/**/*.mdx` only.
- **`docs/catalog/` is reserved:** the platform generates the catalog's pages
  there. A page under it is reported ("docs/catalog/ está reservada para las
  páginas que la plataforma hace del catálogo: esta ficha no se publica") and
  not published. A section that explains the site's data uses another name
  (`docs/data/`, `docs/inventory/`).
- **Images** go in an `img/` folder next to the page that uses them
  (`links.md`).

## Adding a page

1. Pick the section whose topic it is. A topic with no section is a new
   folder with its `index.mdx`.
2. Give it a header (`header.md`), with the next free `orden` of the section.
3. **Menu:** a page inside a folder the menu lists needs nothing (the folder's
   entry brings it, ordered by `orden`). A new folder or loose page needs an
   entry in its group (`colofon-documentation` skill, `references/menu.md`).
4. Link it from the section's "¿Dónde encuentro…?" table, and from the home's
   when it answers a first-time question.
5. If it is about catalog entities, cite them in the header field the site
   declares for them, and point each entity's `ficha` field at the page when
   this is the page that explains it.

## Moving or renaming a page

Renaming changes the URL. In the same change, update:

| What names it | Where |
| --- | --- |
| Relative links `[…](….mdx)` | Every page under `docs/` (`grep -rn "dns.mdx" docs`) |
| `ficha` fields (`page:`) | Entities under `catalog/` |
| Menu entries | `menu.yaml`, when it names the page or its folder |
| Diagram pieces with `"page"` | `diagrams/*.json` |
| Served skills and the agent's map | `skills/` and `AGENTS.md`, when they cite the path |

Every one left behind is reported: a broken link shows as plain text, a
`ficha` to no page fails its entity, a menu entry to nothing is dropped.
