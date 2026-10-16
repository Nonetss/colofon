# Layout

```
doc.config.yaml          # the site: name, contract version, extra header fields
menu.yaml                # the sidebar's groups
docs/
├── index.mdx            # the home
├── getting-started.mdx  # a page at the top level
├── repository/          # a section: index.mdx plus its pages
├── pages/
├── catalog/             # explains the catalog (not catalogo/: that path is reserved)
├── diagrams/
└── publishing/
catalogo/
├── files/               # the files of a content repository
├── field-kinds/         # the kinds of a field
├── header-fields/       # the fields every page header has
├── components/          # the page components
└── diagram-types/       # the diagram types the platform lays out
diagramas/
├── pipeline.json        # from a push to the published site
├── repository.json      # what a repository holds
├── <type>-<topic>.json  # one working example of each diagram type and variant
└── repository-exploded.svg # the illustration example
skills/
└── doc-writing/SKILL.md # served to other agents
```

The contract behind every file is explained in `docs/repository/index.mdx`.

## The menu

`menu.yaml` has four groups: **Start**, **Writing**, **Data** and
**Publishing**. Every page must be shown by an entry; a page that lands in
"Otros" is a mistake to fix.

- A new page inside an existing folder needs nothing: the folder's entry
  brings it, ordered by its `orden`.
- A new folder or loose page gets an entry in the group it belongs to.
- Icons of the entries go in the menu, not in the page headers. A menu
  `titulo` is only for when the sidebar needs a different title, and then the
  page's `titulo` must be the same.
- The catalog is shown as `{ ruta: catalogo, titulo: Reference }` in "Data".

## Sections and pages

- Every folder under `docs/` is a section and has its `index.mdx`.
- One folder per topic of the guide, flat: no deeper than
  `docs/<topic>/<page>.mdx`.
- Order within a section comes from each page's `orden`.

## Naming

- Files and folders: lowercase, digits and hyphens (`getting-started.mdx`).
  They are the URL and the path other pages link to.
- Renaming a page means updating every link to it, every `ficha` field that
  names it (`page:` in `catalogo/files/` and `catalogo/components/`) and its
  menu entry.
- `docs/catalogo/` is reserved by the platform: never create it.
