# content-diagrams Specification

## Purpose
Lets a content repository write diagrams as JSON files under `diagramas/`, in the reference site's scheme format with every box, arrow and zone placed by the content, validated against its catalog and pages, drawn and made interactive by the reader and shown in any page with a component, so a diagram is written once and reused.

## Requirements

### Requirement: Diagram files

A content repository MAY hold a `diagramas/` folder with one `<id>.json` file per diagram, where the id is made of lowercase letters, digits and single hyphens. A `.yaml` or `.yml` file there SHALL be reported as a diagram that is now written as `<id>.json`, and a badly named file SHALL be reported. A diagram file SHALL be a JSON object in one of two forms:
- a **drawn diagram**, declaring `title` (required text), `desc` (required text: what the diagram shows, used as its text alternative), `width` and `height` (required positive numbers: the drawing area, the legend going under it), `nodes` (required, at least one), `edges`, `zones` and `notes` (optional lists);
- a **chain**, declaring `title`, `desc`, `items` (required, at least one node without position) and optionally `links` (one label or `null` per gap between items), `accent` and `dash` (indexes of the gaps whose arrow is of that kind), `y` (40 by default) and `h` (72 by default); the platform SHALL lay its items in one row from left to right, each as wide as its longest line, and SHALL size the drawing to them.

Both forms MAY declare `kindNames` (legend wording per node kind), `edgeNames` (legend wording per edge kind), `badgeName` (legend wording of the badges), `shapes` (a shape per node kind, for every node of that kind without its own) and `colorEdges` (`true`: a default edge takes the hue of the box it leaves), plus `$schema`. Any other key SHALL be reported.

#### Scenario: A valid diagram

- **WHEN** `diagramas/komodo.json` declares `title`, `desc`, `width: 600`, `height: 200`, the nodes `komodo` and `periphery` with their positions and an edge from `komodo` to `periphery` labelled `DEPLOY`
- **THEN** the diagram `komodo` SHALL be valid

#### Scenario: A valid chain

- **WHEN** `diagramas/backup.json` declares `title`, `desc`, three `items` and `links: ["SNAPSHOT", null]`
- **THEN** the diagram SHALL be valid and SHALL render the three boxes in a row joined by two arrows, the first labelled `SNAPSHOT`

#### Scenario: Missing description

- **WHEN** `diagramas/red.json` has no `desc`
- **THEN** it SHALL be reported on `diagramas/red.json` saying `desc` is required

#### Scenario: Old YAML diagram

- **WHEN** `diagramas/pipeline.yaml` exists
- **THEN** it SHALL be reported saying diagrams are now written as `diagramas/pipeline.json`, and no diagram `pipeline` SHALL exist unless that JSON file does

### Requirement: Nodes, connections and zones

`nodes` SHALL be a list of boxes. A box SHALL declare `x`, `y` and `w` (numbers) and, unless it is a table, `h`; it MAY declare:
- `id` (lowercase letters, digits and single hyphens, unique in the diagram): what edges, zones and `needs` name;
- `kind`: `focal` (the central piece), `service` (the default), `store` (data or destination), `input` (user or origin), `external` or `optional` (not in use);
- `tag` (a short text framed at the top of the box), `name` (its name), `sub` (a text or a list of texts under the name) and `shape` (`pill` or `cylinder`);
- `hue`: one of `rose`, `blue`, `cyan`, `violet`, `green`, `indigo`, `fuchsia`, `slate`, `teal` or `lime`;
- `zone` (the id of the zone it sits in, whose hue it takes when it has none), `info` (what the reader's card says about it), `trace` (`true`: hovering it lights up everything reached from it along the accent edges) and `needs` (ids of the boxes it depends on);
- exactly one of `entity` (`<type>/<id>` of an existing entity: the box links to the entity's page, or to its generated catalog page when it has none, and is named by the entity's label when it has no `name`) or `page` (the path of a page of the repository, which the box links to), or neither.

A box SHALL have a `name` or an `entity`. A **table** box SHALL declare `rows` (a list of `{ key?, name, type? }`, `key` being a short mark such as `PK`, `FK` or `UQ`) and MAY declare `more` (a closing line such as "+ 8 columnas más"); its height SHALL follow from its rows.

`edges` SHALL be a list of arrows. An arrow SHALL declare `points` (at least two `[x, y]` pairs, each segment horizontal or vertical) unless it is a badge, and MAY declare `from`, `to` (box ids) or `toZone` (a zone id, when it ends on a whole zone), `kind` (`default`, `accent` for the main path, or `dash` for optional or warning), `label` with `at` (the label's `[x, y]` baseline, required with a label) and `anchor` (`middle` by default, `start` or `end`), `hue`, `info` and `noHead` (`true`: no arrowhead). An arrow with `badge` (a short text) SHALL have no `points`: it SHALL be drawn as a chip on its `from` box and SHALL require `from` and `to`.

`zones` SHALL be a list of `{ x, y, w, h, label }` rectangles that MAY declare `id` (unique, named by boxes' `zone` and edges' `toZone`) and `hue`. `notes` SHALL be a list of `{ x, y, text }` free texts that MAY declare `anchor`.

Every problem SHALL be reported on the diagram's file with the field path, and the parts that are valid SHALL still render.

#### Scenario: Entity that does not exist

- **WHEN** a box says `entity: "machines/old-01"` and `machines` has no `old-01`
- **THEN** the diagram SHALL be reported on `nodes.<index>.entity` naming `machines/old-01`, and the box SHALL render unlinked, named by its `name` or, without one, by its id

#### Scenario: Entity box without a name

- **WHEN** a box says `entity: "services/komodo"`, has no `name`, and the entity's label is "Komodo"
- **THEN** the box SHALL be named "Komodo" and SHALL link to the entity's page

#### Scenario: Page that does not exist

- **WHEN** a box says `page: "red/vpn"` and the repository has no such page
- **THEN** the diagram SHALL be reported on `nodes.<index>.page` naming `red/vpn`, and the box SHALL render unlinked

#### Scenario: Connection to an undeclared node

- **WHEN** an edge says `from: "komodo", to: "stacks"` and no box has the id `stacks`
- **THEN** the diagram SHALL be reported on that edge naming `stacks`, and the edge SHALL still be drawn without that end

#### Scenario: Diagonal segment

- **WHEN** an edge's points go from `[100, 40]` to `[200, 80]`
- **THEN** the diagram SHALL be reported on that edge's `points` as having a diagonal segment between those points, and the edge SHALL be left out

#### Scenario: Node in two zones

- **WHEN** the box `nas` says `zone: ["home", "outside"]`
- **THEN** the diagram SHALL be reported on `nodes.<index>.zone` saying a box sits in one zone, given by its id, and the box SHALL render in no zone

#### Scenario: Zone that does not exist

- **WHEN** the box `nas` says `zone: "casa"` and no zone has the id `casa`
- **THEN** the diagram SHALL be reported on `nodes.<index>.zone` naming `casa`

#### Scenario: Repeated id

- **WHEN** two boxes declare `id: "nas"`
- **THEN** the diagram SHALL be reported on the second one naming `nas` as repeated

#### Scenario: Label without position

- **WHEN** an edge declares `label: "PULL"` and no `at`
- **THEN** the diagram SHALL be reported on that edge saying a label needs `at`, and the edge SHALL be drawn without its label

### Requirement: Diagram component

`<Diagram id="…" />`, written as a block, SHALL render the diagram `diagramas/<id>.json` in the page. A missing `id`, an id with no diagram file, an attribute other than `id` or an attribute value in braces SHALL be reported with the component's line, and a missing diagram SHALL render a notice in its place. A `<Diagram>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice. The same diagram MAY be shown in any number of pages.

#### Scenario: Shown in two pages

- **WHEN** the pages `index` and `containers/komodo` both hold `<Diagram id="komodo" />`
- **THEN** both SHALL show the diagram `komodo` and no problem SHALL be reported

#### Scenario: Unknown diagram

- **WHEN** a page holds `<Diagram id="mapa" />` and there is no `diagramas/mapa.json`
- **THEN** the page SHALL be reported on that line naming `mapa`, and a notice SHALL render where the diagram would be

### Requirement: How a diagram renders

A diagram SHALL render as a figure holding a drawing at the positions the content gives, in the style of the reference schemes:
- the drawing on a paper background; each box as a rounded rectangle (or a pill or cylinder by its `shape`) styled by its `kind`, with its `tag` framed at the top left (centred on a pill or cylinder), its name centred over its `sub` lines in a monospace face; the focal box and its tag in the accent colour, an `optional` box dashed;
- a table box with its name and tag on top, a hairline, and one row per column with its key (a `PK` in the accent colour), name and type, then its `more` line;
- a hued box, zone, arrow or label tinted by its hue;
- each arrow along its points with rounded corners and an arrowhead (none with `noHead`), solid for `default`, in the accent colour for `accent`, dashed for `dash`; a default arrow takes its own `hue`, or with `colorEdges` the hue of the box it leaves; its label in small monospace capitals at `at` on a mask;
- each badge as a pill on the top row of its `from` box, from the right corner leftwards, in the hue of its `to` box;
- each zone as a dashed (or, hued, a tinted) frame with its label in small capitals on a mask, drawn over the arrows;
- each note as free monospace text;
- under the drawing, a hairline and a "LEYENDA" strip naming only the node kinds, edge kinds and badges the diagram uses, in that order, worded by `kindNames`, `edgeNames` and `badgeName` when given ("Pieza central", "Servicio", "Datos / destino", "Usuario / origen", "Externo", "Sin uso", "Conexión", "Camino principal", "Opcional / aviso", "Conexión con una pieza lejana" otherwise), wrapping onto more rows when it does not fit the width.

A box with `entity` or `page` SHALL link to its page. The drawing SHALL follow the reader's light or dark theme, SHALL never be wider than drawn, SHALL shrink to the column's width (and keep its size, scrolling sideways, on narrow screens) and SHALL open enlarged like the page's images. The drawing SHALL be marked as an image described by the diagram's `title` and `desc`. A drawn diagram SHALL show nothing but its drawing: its caption (`title` and `desc`) and its text version (its zones, each with its label and the names of its boxes, and its connections, one per arrow or badge with a `from` and a `to` or `toZone`, as "<from name> → <to name>: <label or badge>", with linked names linked as in the drawing) SHALL stay in the page for assistive technology, hidden from sight. The caption and text version SHALL be the diagram's Markdown in `llm.txt`, without the drawing.

#### Scenario: Text version

- **WHEN** a page shows the diagram `komodo`, whose box `komodo` is `entity: "services/komodo"` with `page: containers/komodo`, with an edge to the box `periphery` (`name: "Periphery"`) labelled `DEPLOY`
- **THEN** the figure SHALL be captioned with the diagram's title and description and its text version SHALL hold the line "Komodo → Periphery: DEPLOY", with "Komodo" linking to the page `containers/komodo`

#### Scenario: Drawn diagram

- **WHEN** a page shows a diagram with a `focal` box, two `service` boxes, an `input` box, two `default` edges and one `accent` edge, and `edgeNames: { "accent": "Despliegue" }`
- **THEN** the figure SHALL hold a drawing with four boxes at their given positions, three arrows, and a legend naming "Pieza central", "Servicio", "Usuario / origen", "Conexión" and "Despliegue", and SHALL show no caption or text version

#### Scenario: Hue from the zone

- **WHEN** the zone `casa` has `hue: "teal"` and the box `nas`, with no hue, says `zone: "casa"`
- **THEN** the box `nas` SHALL be drawn in the teal hue

#### Scenario: Badge

- **WHEN** an edge says `from: "grafana", to: "authentik", badge: "SSO"`
- **THEN** no line SHALL be drawn for it, the box `grafana` SHALL show an "SSO" chip in the hue of `authentik`, and the legend SHALL name "Conexión con una pieza lejana"

#### Scenario: Entity node in the drawing

- **WHEN** a diagram's box is `entity: "services/komodo"` and the entity has no `page`
- **THEN** the box SHALL link to the generated page `catalogo/services/komodo`

#### Scenario: Markdown without the drawing

- **WHEN** an agent reads the `llm.txt` of a page showing `komodo`
- **THEN** the diagram SHALL appear as its caption followed by its zones and connections as text, and nothing of the drawing

### Requirement: Diagrams are read with the pages

Diagram files SHALL be read when the pages are, from the same checkout, and their problems SHALL be reported per file and logged with the pages' problems. Every page that shows a diagram SHALL also report that diagram's problems, naming the diagram's file, as it reports the invalid entities of an `<Entities>` table. A broken diagram SHALL NOT stop any page or other diagram from being read.

#### Scenario: One broken diagram

- **WHEN** `diagramas/red.json` holds a JSON syntax error and `diagramas/komodo.json` is valid
- **THEN** `diagramas/red.json` SHALL be reported with its line and column, pages showing `komodo` SHALL render it, and pages showing `red` SHALL show a notice

### Requirement: Measured problems

The platform SHALL measure each box's texts with an average glyph width per font and size and SHALL report, on the box's field path, every `name`, `sub` line, table column or tag-plus-name that does not fit the box's width, and every box whose badges do not fit beside its tag. These problems SHALL NOT stop the diagram from rendering.

#### Scenario: Name too wide

- **WHEN** a box 120 wide is named "Registro de contenedores de Gitea"
- **THEN** the diagram SHALL be reported on that box saying the name does not fit in 120px, and the box SHALL still render

### Requirement: Diagram interaction

In the reader, hovering or focusing a part of a drawing SHALL light it up with what it touches and fade the rest, and SHALL show a card next to the pointer (next to the part, on focus):
- a box: the arrows and badges that start or end on it (an arrow with `toZone` touching every box of that zone) and the boxes at their other end; the card SHALL give its name, its tag, its `info`, and its connections as "→ <name>" or "← <name>" with each one's label;
- a box with `needs` among the diagram's boxes: the card SHALL also list "Depende de" with the boxes it needs; and for any box, every box that needs it, directly or through others, SHALL stay lit and be marked as falling, listed under "Si se cae, afecta a" with the box it falls through when that is not the hovered one;
- a box with `trace`: everything reached from it along the accent arrows plus its own other arrows, the card listing those accent steps under "Camino principal";
- an arrow (along a band wider than its line) or a badge: the arrow and its ends, the card giving "<from> → <to>", its label and its `info`;
- a zone title with an id: every box of the zone and their arrows, the card giving the zone's label, how many pieces it holds and their names.

Leaving, losing focus or pressing Escape SHALL clear it. On a touch screen the first tap on a part SHALL show it and keep it shown, a second tap on a linked box SHALL follow its link, and a tap outside SHALL clear it. The interaction SHALL work on pages the router swaps in and in the enlarged view, and SHALL only run on the platform's own diagrams.

#### Scenario: Hovering a box

- **WHEN** a reader hovers the box `komodo`, which has an edge to `periphery` labelled `DEPLOY`
- **THEN** `komodo`, `periphery` and that edge SHALL be lit, the rest faded, and the card SHALL list "→ Periphery" with `DEPLOY`

#### Scenario: What falls with a box

- **WHEN** the box `grafana` says `needs: ["authentik"]`, the box `wiki` says `needs: ["grafana"]`, and the reader hovers `authentik`
- **THEN** `grafana` and `wiki` SHALL be lit and marked as falling, and the card SHALL list under "Si se cae, afecta a" "Grafana" and "Wiki" with "por Grafana"

#### Scenario: Touch screen

- **WHEN** a reader taps once on a linked box on a touch screen
- **THEN** the box SHALL be lit with its card and the link SHALL NOT be followed until the box is tapped again
