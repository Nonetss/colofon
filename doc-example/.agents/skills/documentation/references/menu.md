# The menu (`menu.yaml`)

`menu.yaml` decides what the sidebar shows, grouped and ordered, wherever the
pages are stored. The contract is the guide's `repository/menu` page. It is a **declaration**: while it is broken, the
platform keeps its last valid version.

## Keys

```yaml
secciones:
  - titulo: Datos
    icono: database
    descripcion: El catálogo, desde declarar un tipo hasta explorarlo en el lector
    paginas:
      - { ruta: data, icono: table }
      - { ruta: catalog, titulo: Referencia }
```

| Key | What it is |
| --- | --- |
| `secciones` | Required. The groups, in order, at least one. |
| `titulo` | Required. The group's title in the sidebar. |
| `icono` | Optional. A Lucide icon name for the group. |
| `descripcion` | Optional. One sentence on what the group holds. |
| `paginas` | Required. Its entries, in order, at least one. |

An entry is a path, or `{ ruta, titulo?, icono? }`:

| Entry names… | Example | Brings |
| --- | --- | --- |
| A page | `getting-started`, `network/dns` | That page |
| A folder of `docs/` | `pages` | The section and all its pages, in their `orden` |
| The catalog | `catalog` | Every type's generated page |
| One catalog type | `catalog/files` | That type's page |

`titulo` on an entry overrides the page's title everywhere; `icono` its icon.
Any other key is rejected. **Folders store the pages; the menu decides where
they show**: a group can gather folders from anywhere, and each page keeps its
URL.

## The site's menu

Read `menu.yaml` before adding a page: its groups, what each shows and how
its entries are written (with an icon, a folder or a single page) are the
site's choice. Follow the shape the existing entries already have. The home
(`docs/index.mdx`) is never an entry: it always shows as «Inicio».

## Rules

- **Every page must be shown by an entry**; a page that lands in "Otros" is a
  mistake to fix.
- A new page inside an existing folder **needs nothing**: the folder's entry
  brings it, ordered by its `orden`.
- A new folder or loose page **gets an entry in the group it belongs to**,
  as `{ ruta: <folder>, icono: <lucide> }`.
- **Icons of the entries go in the menu**, not in the page headers. A section
  folder's icon is its entry's `icono`; the `icono` of its `index.mdx` is
  then ignored.
- A menu `titulo` is only for when the sidebar needs a different title, and
  then the page's `titulo` must be the same (it is required in every header
  anyway).
- The catalog's generated pages also need an entry (`catalog`, or
  `catalog/<type>` for one type), or they land in "Otros".
- Group titles and descriptions are in the site's prose language.

## The menu wins

What the menu says about an entry is what every view shows: the sidebar, the
page header, breadcrumbs, cards, search and `llms.txt`. The page's header only
counts for what the menu leaves unsaid. A header that disagrees is reported
("titulo: la cabecera dice «…», pero manda menu.yaml («…»)", same for
`icono`), so nobody edits a value that is never shown. Breadcrumbs start with
the group, as plain text.

## Reported

All on the repository's home, to admins:

| Written | Message | Effect |
| --- | --- | --- |
| An entry that names nothing | "secciones.N.paginas.M: `x` no es ninguna página ni carpeta de docs/, ni catalog, ni un tipo del catálogo" | Entry dropped, the rest used |
| The home as an entry (`index`) | "…: la portada no va en el menú: sale siempre como «Inicio»" | Entry dropped |
| Something an earlier entry already shows (same path, its folder, a page inside it) | "…: `x` ya sale en el menú con `y`" | Entry dropped |
| A page or type no entry shows | "Esta página no está en menu.yaml: sale en «Otros»", on the page | Listed in a last group "Otros" |
| An unknown key, a missing title, an icon Lucide lacks | The schema's message | Last valid `menu.yaml` kept |

Without any `menu.yaml`, the sidebar is the folders of `docs/` ordered by
their `index.mdx`'s `orden`, with the catalog last. Keep one: it is what
decides the groups.
