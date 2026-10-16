## MODIFIED Requirements

### Requirement: Diagram files

A content repository MAY hold a `diagrams/` folder with one file per diagram, named `<id>.json` or `<id>.svg`, where the id is made of lowercase letters, digits and single hyphens. A `.yaml` or `.yml` file there SHALL be reported as a diagram that is now written as `<id>.json`, a badly named file SHALL be reported, and an id with both a `.json` and a `.svg` file SHALL be reported on the `.svg` file, the `.json` one being the diagram. A `.svg` file is an **illustration** (see "SVG illustrations"). A diagram `.json` file SHALL be a JSON object in one of three forms:
- a **drawn diagram**, with no `type`, declaring `title` (required text), `desc` (required text: what the diagram shows, used as its text alternative), `width` and `height` (required positive numbers: the drawing area, the legend going under it), `nodes` (required, at least one), `edges`, `zones` and `notes` (optional lists);
- a **chain**, with no `type`, declaring `title`, `desc`, `items` (required, at least one node without position) and optionally `links` (one label or `null` per gap between items), `accent` and `dash` (indexes of the gaps whose arrow is of that kind), `y` (40 by default) and `h` (72 by default); the platform SHALL lay its items in one row from left to right, each as wide as its longest line, and SHALL size the drawing to them;
- a **typed diagram**, declaring `type` (one of the types of `content-diagram-types`), `title`, `desc` and the keys of that type, laid out by the platform as that capability describes. An unknown `type` SHALL be reported listing the known ones, and no diagram SHALL render for that file.

The drawn diagram and the chain MAY declare `kindNames` (legend wording per node kind), `edgeNames` (legend wording per edge kind), `badgeName` (legend wording of the badges), `shapes` (a shape per node kind, for every node of that kind without its own) and `colorEdges` (`true`: a default edge takes the hue of the box it leaves). Every form MAY declare `$schema`. Any other key SHALL be reported.

#### Scenario: A valid diagram

- **WHEN** `diagrams/komodo.json` declares `title`, `desc`, `width: 600`, `height: 200`, the nodes `komodo` and `periphery` with their positions and an edge from `komodo` to `periphery` labelled `DEPLOY`
- **THEN** the diagram `komodo` SHALL be valid

#### Scenario: A valid chain

- **WHEN** `diagrams/backup.json` declares `title`, `desc`, three `items` and `links: ["SNAPSHOT", null]`
- **THEN** the diagram SHALL be valid and SHALL render the three boxes in a row joined by two arrows, the first labelled `SNAPSHOT`

#### Scenario: A valid typed diagram

- **WHEN** `diagrams/login.json` declares `type: "sequence"`, `title`, `desc`, two actors and three messages
- **THEN** the diagram `login` SHALL be valid and SHALL render as a sequence diagram

#### Scenario: Unknown type

- **WHEN** `diagrams/mapa.json` declares `type: "mindmap"`
- **THEN** it SHALL be reported on `type` naming `mindmap` and listing the known types, and pages showing `mapa` SHALL show a notice

#### Scenario: Same id twice

- **WHEN** both `diagrams/planta.json` and `diagrams/planta.svg` exist
- **THEN** `diagrams/planta.svg` SHALL be reported as repeating the id `planta`, and `<Diagram id="planta" />` SHALL render the JSON diagram

#### Scenario: Missing description

- **WHEN** `diagrams/red.json` has no `desc`
- **THEN** it SHALL be reported on `diagrams/red.json` saying `desc` is required

#### Scenario: Old YAML diagram

- **WHEN** `diagrams/pipeline.yaml` exists
- **THEN** it SHALL be reported saying diagrams are now written as `diagrams/pipeline.json`, and no diagram `pipeline` SHALL exist unless that JSON file does

### Requirement: Diagram component

`<Diagram id="…" />`, written as a block, SHALL render the diagram `diagrams/<id>.json`, or the illustration `diagrams/<id>.svg` when there is no JSON file, in the page. A missing `id`, an id with no diagram file, an attribute other than `id` or an attribute value in braces SHALL be reported with the component's line, and a missing diagram SHALL render a notice in its place. A `<Diagram>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice. The same diagram MAY be shown in any number of pages.

#### Scenario: Shown in two pages

- **WHEN** the pages `index` and `containers/komodo` both hold `<Diagram id="komodo" />`
- **THEN** both SHALL show the diagram `komodo` and no problem SHALL be reported

#### Scenario: Illustration

- **WHEN** a page holds `<Diagram id="despiece" />` and only `diagrams/despiece.svg` exists
- **THEN** the page SHALL show that illustration

#### Scenario: Unknown diagram

- **WHEN** a page holds `<Diagram id="mapa" />` and there is no `diagrams/mapa.json` nor `diagrams/mapa.svg`
- **THEN** the page SHALL be reported on that line naming `mapa`, and a notice SHALL render where the diagram would be

### Requirement: How a diagram renders

A drawn diagram or chain SHALL render as a figure holding a drawing at the positions the content gives, in the style of the reference schemes:
- the drawing on a paper background; each box as a rounded rectangle (or a pill, cylinder, diamond, circle or rounded shape by its `shape`) styled by its `kind`, with its `tag` framed at the top left (centred on any shape other than the rectangle), its name centred over its `sub` lines in a monospace face; the focal box and its tag in the accent colour, an `optional` box dashed;
- a table box with its name and tag on top, a hairline, and one row per column with its key (a `PK` in the accent colour), name and type, then its `more` line, then, with `ops`, a hairline and one row per operation;
- a hued box, zone, arrow or label tinted by its hue;
- each arrow along its points (orthogonal with rounded corners, or a smooth curve with `route: "curve"`) and ending in its `head` (none with `noHead`), solid for `default`, in the accent colour for `accent`, dashed for `dash`; a default arrow takes its own `hue`, or with `colorEdges` the hue of the box it leaves; its label in small monospace capitals at `at` on a mask;
- each badge as a pill on the top row of its `from` box, from the right corner leftwards, in the hue of its `to` box;
- each zone as a dashed (or, hued, a tinted) frame with its label in small capitals on a mask, drawn over the arrows;
- each note as free monospace text;
- under the drawing, a hairline and a "LEYENDA" strip naming only the node kinds, edge kinds and badges the diagram uses, in that order, worded by `kindNames`, `edgeNames` and `badgeName` when given ("Pieza central", "Servicio", "Datos / destino", "Usuario / origen", "Externo", "Sin uso", "Conexión", "Camino principal", "Opcional / aviso", "Conexión con una pieza lejana" otherwise), wrapping onto more rows when it does not fit the width.

A typed diagram SHALL render as a figure holding the drawing its type describes (`content-diagram-types`), with the same paper, hairlines, faces, accent and hue tokens, and the legend strip its type lists. An illustration SHALL render as a figure holding its sanitized drawing (see "SVG illustrations").

A box or typed item with `entity` or `page` SHALL link to its page. Every drawing SHALL follow the reader's light or dark theme, SHALL never be wider than drawn, SHALL shrink to the column's width (and keep its size, scrolling sideways, on narrow screens) and SHALL open enlarged in the page's image viewer from an "Ampliar" button on the diagram, never from a click on the drawing itself, whose boxes, arrows, marks and links keep the pointer. The drawing SHALL be marked as an image described by the diagram's `title` and `desc`. A diagram SHALL show nothing but its drawing: its caption (`title` and `desc`) and its text version SHALL stay in the page for assistive technology, hidden from sight. A drawn diagram's or chain's text version SHALL hold its zones, each with its label and the names of its boxes, and its connections, one per arrow or badge with a `from` and a `to` or `toZone`, as "<from name> → <to name>: <label or badge>", with linked names linked as in the drawing; a typed diagram's text version SHALL be the one its type describes; an illustration's SHALL be empty. The caption and text version SHALL be the diagram's Markdown in `llm.txt`, without the drawing.

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

#### Scenario: Inheritance head

- **WHEN** an edge from `admin` to `user` says `head: "triangle"`
- **THEN** it SHALL end on `user` in a hollow triangle

#### Scenario: Entity node in the drawing

- **WHEN** a diagram's box is `entity: "services/komodo"` and the entity has no `page`
- **THEN** the box SHALL link to the generated page `catalog/services/komodo`

#### Scenario: Markdown without the drawing

- **WHEN** an agent reads the `llm.txt` of a page showing `komodo`
- **THEN** the diagram SHALL appear as its caption followed by its zones and connections as text, and nothing of the drawing

### Requirement: Diagrams are read with the pages

Diagram files SHALL be read when the pages are, from the same checkout, and their problems SHALL be reported per file and logged with the pages' problems. Every page that shows a diagram SHALL also report that diagram's problems, naming the diagram's file, as it reports the invalid entities of an `<Entities>` table. A broken diagram SHALL NOT stop any page or other diagram from being read.

#### Scenario: One broken diagram

- **WHEN** `diagrams/red.json` holds a JSON syntax error and `diagrams/komodo.json` is valid
- **THEN** `diagrams/red.json` SHALL be reported with its line and column, pages showing `komodo` SHALL render it, and pages showing `red` SHALL show a notice

### Requirement: SVG illustrations

A `diagrams/<id>.svg` file SHALL be an illustration: a drawing written by hand (for an exploded axonometric, an axonometric plan or any figure no typed form lays out). Its root `<svg>` SHALL declare `viewBox` and SHALL hold a `<title>` and a `<desc>`, which SHALL be its title and description; either one missing SHALL be reported and the illustration SHALL NOT render. The platform SHALL keep only `svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `title` and `desc`, with their geometry attributes, `transform`, `opacity`, `fill-opacity`, `stroke-opacity`, `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`, `text-anchor`, `font-size` and `font-weight`, `fill` and `stroke` only with the value `none`, and `class` only with the role classes `ink`, `muted`, `soft`, `paper`, `accent`, `accent-soft` and the ten hue names, which the platform SHALL map to its theme tokens. Every other element, attribute, class or value SHALL be removed and reported once per kind with how many times it appeared, and the rest SHALL render. An unparsable file SHALL be reported and SHALL NOT render.

#### Scenario: Valid illustration

- **WHEN** `diagrams/despiece.svg` has a `viewBox`, a `<title>`, a `<desc>`, and paths with `class="ink"` and `class="accent"`
- **THEN** it SHALL render with those paths in the theme's ink and accent colours, in light and dark

#### Scenario: Hex colours

- **WHEN** an illustration's paths say `fill="#eb6c36"` 14 times
- **THEN** the file SHALL be reported once saying `fill="#eb6c36"` was removed 14 times and colours go through the role classes, and the paths SHALL render with the theme's default fill

#### Scenario: Script

- **WHEN** an illustration holds a `<script>` and an `onclick` attribute
- **THEN** both SHALL be removed and reported, and nothing of them SHALL reach the page

#### Scenario: Missing description

- **WHEN** an illustration has a `<title>` but no `<desc>`
- **THEN** it SHALL be reported saying `<desc>` is required, and pages showing it SHALL show a notice
