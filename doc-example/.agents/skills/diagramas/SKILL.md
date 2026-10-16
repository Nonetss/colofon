# Diagrams

The format is explained in the guide's `docs/diagrams/` section: the overview
and the type table in `index.mdx`, the drawn form in `drawn.mdx`, one page
per family of types (`graphs.mdx`, `time.mdx`, `concepts.mdx`, `charts.mdx`,
`proportions.mdx`, `comparison.mdx`) and the hand-drawn SVG in
`illustrations.mdx`. This reference holds how **this site** uses diagrams.

## This site's diagrams

| File | What it shows | Shown in |
| --- | --- | --- |
| `diagramas/pipeline.json` | From a push to the reader, the editor and agents | `docs/index.mdx`, `docs/diagrams/index.mdx`, `docs/diagrams/drawn.mdx`, `docs/pages/components.mdx`, `docs/publishing/index.mdx` |
| `diagramas/repository.json` | The files of a repository and how they relate | `docs/index.mdx`, `docs/repository/index.mdx`, `docs/catalog/index.mdx` |
| `diagramas/<type>-<topic>.json` | One working example of each diagram type and of each variant (`line-slope-sections`, `polar-sync-hours-lollipop`…) | The page of its family, under its type's section |
| `diagramas/sync-shapes.json`, `diagram-forms.json` | The drawn form's shapes, curves, loops, UML heads and `ops` | `docs/diagrams/drawn.mdx` |
| `diagramas/repository-exploded.svg` | The illustration example | `docs/diagrams/illustrations.mdx` |

## Choosing the form

- **If the pieces follow a rule** (a flow, a tree, a timeline, values), use
  its `type`: the platform lays it out, checks its budget and gives it a text
  version. The type table on `docs/diagrams/index.mdx` (the `diagram-types`
  catalog) says which fits.
- **Draw by hand** (no `type`) what needs its place: architectures,
  deployments, data models, UML classes.
- **An `.svg` illustration** only for a figure no data describes (an exploded
  view, a floor plan); it has no text version, so its `<desc>` must say it all.

## Writing one

- One file per diagram in `diagramas/`, the file name as its id; shown with
  `<Diagram id="…" />` in a block of its own.
- The keys are in English, as the guide's pages list them. Names, tags,
  labels and `info` are in Spanish, like the rest of the site.
- **A piece that exists in the catalog is an entity** (`"entity": "files/menu"`),
  so it links to the entity's page and that page lists the diagram. Otherwise
  `"page"` links it to a page of this site.
- **One focus:** at most two things in the accent (focal pieces and main
  paths); stay inside the type's budget. Both are reported otherwise.
- In a drawn diagram the content places everything: every box's `x`, `y`,
  `w`, `h`, every arrow's `points` and its label's `at`, on a 4px grid. Mark
  the origin with `"trace": true` and the main path with `"kind": "accent"`;
  give boxes `needs` when one depends on another.
- Labels say what travels along an arrow, short and in capitals; the full
  sentence goes in its `info`, which the reader's card shows.
- A new type or variant on the platform gets an entity in
  `catalogo/diagram-types/`, a section on its family's page and its own
  `<type>-<topic>` example.
- Before reusing a diagram in another page, check it still says what that page
  needs; otherwise write a new one.
- After changing one, check that the platform reports nothing for it on the
  repository's home.
