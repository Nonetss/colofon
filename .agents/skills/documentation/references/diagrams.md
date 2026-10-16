# Diagrams

The format is explained in the guide, `docs/diagrams/index.mdx`. This
reference holds how **this site** uses diagrams.

## This site's diagrams

| File | What it shows | Shown in |
| --- | --- | --- |
| `diagramas/pipeline.json` | From a push to the reader, the editor and agents | `docs/index.mdx`, `docs/diagrams/index.mdx`, `docs/publishing/index.mdx` |
| `diagramas/repository.json` | The files of a repository and how they relate | `docs/index.mdx`, `docs/repository/index.mdx`, `docs/catalog/index.mdx` |

## Writing one

- One JSON file per diagram in `diagramas/`, the file name as its id; shown
  with `<Diagram id="…" />` in a block of its own.
- The keys are those of the old site's scheme drawer (`lib.mjs`), in English:
  `title`, `desc`, `width`, `height`, `nodes`, `edges`, `zones`, `notes`,
  or `items` + `links` for a chain. Box names, tags, labels and `info` are in
  Spanish, like the rest of the site.
- **The content places everything:** every box's `x`, `y`, `w`, `h`, every
  arrow's `points` (horizontal or vertical segments only) and its label's
  `at`. Keep to a 4px grid and leave room for labels; the platform reports
  text that does not fit its box.
- **A box that exists in the catalog is an entity** (`"entity": "files/menu"`),
  so it links to the entity's page and that page lists the diagram. Otherwise
  `"page"` links it to a page of this site.
- Labels say what travels along an arrow, short and in capitals; the full
  sentence goes in its `info`, which the reader's card shows.
- Mark the origin with `"trace": true` and the main path with `"kind":
  "accent"`; give boxes `needs` when one depends on another.
- One diagram, one idea; past about a dozen boxes, split it.
- Before reusing a diagram in another page, check it still says what that page
  needs; otherwise write a new one.
- After changing one, check that the platform reports nothing for it on the
  repository's home.
