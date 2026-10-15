## Why

The diagrams in `diagramas/*.yaml` are placed by ELK and only know nodes, connections and zones. They cannot be drawn like the schemes of the reference site (`doc-sjd/site/esquemas`, drawn by its `lib.mjs`): tagged boxes, one focal piece, hued zones, right-angle arrows with their label wherever it reads best, badges, database tables, free notes and a legend worded per diagram. Nor do they have its interaction (lighting up what a box touches, the main path, what falls when a piece falls). We want the reader's diagrams to follow that format, written as JSON with the coordinates as in `lib.mjs`, so the doc-sjd schemes can be moved over almost by copying them.

## What Changes

- **BREAKING** A diagram is `diagramas/<id>.json` (no longer `.yaml`), with `lib.mjs`'s English keys: `title`, `desc`, `width`, `height`, `nodes`, `edges`, `zones`, `notes`, `kindNames`, `edgeNames`, `badgeName`, `shapes`, `colorEdges`, plus the `chain` variant (`items` + `links`, laid in a row by the platform). A `diagramas/<id>.yaml` is reported as now being `.json`.
- **BREAKING** The content gives the positions: every box carries `x`, `y`, `w`, `h` (a table box no `h`), every arrow its `points` (right angles only) and its label's `at`, every zone its rectangle. ELK (`elkjs`) and `direccion` go away.
- Nodes as in `lib.mjs`: `kind` (`focal`, `service`, `store`, `input`, `external`, `optional`), `tag`, `name`, `sub` (a text or a list), `shape` (`pill`, `cylinder`), `hue` (one of `lib.mjs`'s ten), `zone`, `info`, `trace`, `needs`, and table nodes (`rows` of `key`/`name`/`type`, plus `more`). Instead of a raw `href`, a node links with `entity` (`<type>/<id>`, which also names it when it has no `name`) or `page` (a page path of the repository); both are checked.
- **BREAKING** Nodes no longer take `icono`, `tipo`, `nombre` or `entidad`: their look comes from `kind`, `tag` and `shape`.
- Edges as in `lib.mjs`: `from`, `to`, `toZone`, `kind` (`default`, `accent`, `dash`), `label`, `at`, `anchor`, `hue`, `info`, `noHead` and `badge` (no line: a chip on the `from` box).
- What `lib.mjs` threw or warned about is reported on the file with the field path: a diagonal segment (the edge is left out), a text that does not fit its box, badges that do not fit, a repeated id or one that does not exist.
- The drawing copies `lib.mjs`'s look (paper, boxes with a framed tag, the focal piece in the accent colour, `color-mix` hues, masks under labels, a "LEYENDA" strip with only what is used) as sanitized hast, coloured by the reader's stylesheet for the light and dark themes.
- The reader gains the interaction of `doc-sjd/site/src/lib/esquemas.ts`: hovering or focusing a box, arrow, badge or zone title lights up what it touches, and a card next to the pointer says what it is, its connections, the main path (`trace`), what it depends on and what falls with it (`needs`); on a touch screen the first tap shows and the second follows the link. It works in the enlarged view too.
- The text version (screen readers and `llm.txt`) and the "Diagramas" section of an entity's page stay, now built from `from`/`to` and `entity`.
- The editor schema moves to `diagramas/*.json` and accepts `$schema`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `content-diagrams`: the file becomes JSON in `lib.mjs`'s format, the content gives the positions, new box kinds, hues, badges, tables, notes and a configurable legend, new measured problems, the new look and the reader's interaction.
- `content-editor-schemas`: the catalog entry is `diagramas/*.json` and the diagram schema describes the new format (`entity` lists `<type>/<id>`, `page` the page paths).
- `content-contract`: diagram nodes no longer accept `icono`.

## Impact

- `packages/content`: `src/pages/diagrams.ts` (new reading and checks), `diagram-svg.ts` (rewritten), `diagram-layout.ts` and the `elkjs` dependency (removed; only `chain`'s row placement remains), `to-hast.ts` (the SVG's allowed classes and `data-*` attributes), `load.ts`, `editor-schemas.ts`, `transform.ts` (messages naming `.yaml`) and their tests.
- `packages/api`: the `v1/content` tests that read diagrams or the schema catalog.
- `apps/frontend`: `global.css` (the drawing's styles and light/dark hues, the card), an interaction module in `features/docs/page/model/` set up with the other page scripts, `doc-lightbox.tsx` where the enlarged view needs it, and their tests.
- Content repositories: `documentacion` (its two diagrams, `catalogo/files/diagram-file.yaml` and the pages explaining diagrams) and this repo's guide `docs/human/contenido.md` must be rewritten to the new format; doc-sjd's schemes can be moved to JSON.
- No database migrations.
