## ADDED Requirements

### Requirement: Typed diagram forms

A diagram file with `type` (`content-diagrams`) SHALL be read as the form of that type. The types SHALL be `flowchart`, `state`, `tree`, `org-chart`, `dependency`, `sequence`, `timeline`, `gantt`, `swimlane`, `kanban`, `story-map`, `journey`, `quadrant`, `wardley`, `venn`, `pyramid`, `layers`, `loop`, `fishbone`, `matrix`, `bar`, `waterfall`, `line`, `scatter`, `heatmap`, `treemap`, `radar`, `polar`, `sankey` and `architecture-delta`. Their layout grammars, budgets and look SHALL be ported from diagram-design's type references (MIT, credited in the code that ports them) onto the platform's theme tokens. A type MAY accept `variant`, whose values each type lists; an unknown variant SHALL be reported and the type's default drawing used. Every typed form SHALL accept `$schema`, `title`, `desc` and its own keys; any other key SHALL be reported. The platform SHALL compute every position and size, SHALL size the drawing to its content and SHALL report every problem on its field path while still rendering what is valid, as `content-diagrams` does.

#### Scenario: Key of another type

- **WHEN** a `type: "timeline"` file declares `actors`
- **THEN** it SHALL be reported saying `actors` is not a key of a timeline, listing the keys it accepts

#### Scenario: Unknown variant

- **WHEN** a `type: "line"` file declares `variant: "area"`
- **THEN** it SHALL be reported on `variant` listing `slope`, `ridgeline`, `stream` and `bump`, and SHALL render as a plain line chart

### Requirement: Typed items

Wherever a type below names an **item** (a step, state, node, actor, task, card, event, component, set, level, layer or category), it SHALL be an object with `name` (required unless `entity` gives it) and MAY declare `id` (the id pattern of `content-diagrams`, unique in the diagram, required wherever another part names the item), `sub` (a text or list of texts), `info` (the reader's card), `hue` (one of the ten hues), `focal` (`true`: drawn in the accent) and one of `entity` or `page`, checked, named and linked exactly as a box's. A reference to an item id that does not exist SHALL be reported naming it, and the part holding it SHALL be left out. An item with `entity` SHALL make the diagram appear among that entity's diagrams.

#### Scenario: Linked step

- **WHEN** a flowchart step says `entity: "services/komodo"` and has no `name`
- **THEN** the step SHALL be named by the entity's label and SHALL link to its page, and the entity's page SHALL list the diagram

#### Scenario: Missing reference

- **WHEN** a sequence message says `from: "api", to: "db"` and no actor has the id `db`
- **THEN** it SHALL be reported on that message naming `db`, and the message SHALL be left out

### Requirement: Complexity budgets

Each type SHALL have the complexity budget stated in its requirement below. Every limit exceeded SHALL be reported once on the diagram, naming the limit and the count, and suggesting splitting the diagram; the diagram SHALL still render whole.

#### Scenario: Over budget

- **WHEN** a `sankey` declares 10 nodes
- **THEN** it SHALL be reported saying a Sankey holds at most 8 nodes and this one has 10, and SHALL render all 10

### Requirement: Values and dates

Wherever a type below takes a number, it SHALL be a finite JSON number. A type that takes values MAY declare `unit` (a text after each value, such as "usuarios" or "€") and `decimals` (0 by default). Values SHALL be shown with the Spanish thousands and decimal separators. Wherever a type takes a date, it SHALL be `YYYY-MM-DD` or `YYYY-MM` (the first day of the month), and SHALL be shown with Spanish short month names ("3 mar 2026", "mar 2026"). An invalid number or date SHALL be reported and its part left out.

#### Scenario: Formatted value

- **WHEN** a bar has the value 1234.5, with `unit: "€"` and `decimals: 1`
- **THEN** it SHALL be labelled "1.234,5 €"

#### Scenario: Bad date

- **WHEN** a Gantt task says `start: "2026-13-01"`
- **THEN** it SHALL be reported on that task's `start` and the task SHALL be left out

### Requirement: Flowchart

`type: "flowchart"` SHALL declare `steps` (items with `id`, each MAY declare `kind`: `step` (default, a rectangle), `start` or `end` (a pill), `decision` (a diamond) or `io` (a parallelogram), and `row`/`col` (non-negative integers)) and `links` (`{ from, to, label?, kind? }`, `kind` being `default`, `accent` or `dash`). Without `row`, a step's row SHALL be its longest distance from a `start` step (or from the first step), and without `col`, its order of appearance in that row. The platform SHALL place steps on that grid, centred per row, and SHALL route each link orthogonally from the step's side facing the target through the gutters between rows and columns, never across a step. A link going to an earlier row SHALL be routed around the side of the grid. Budget: 12 steps, 16 links, 3 exits per decision. Text version: one line per link "<from> → <to>: <label>", in order.

#### Scenario: Automatic rows

- **WHEN** a flowchart has steps `inicio` (start), `revisa` (decision), `aprueba` and `rechaza`, with links `inicio → revisa`, `revisa → aprueba` labelled "SÍ" and `revisa → rechaza` labelled "NO", and no `row`
- **THEN** `inicio` SHALL be in row 0, `revisa` in row 1, `aprueba` and `rechaza` side by side in row 2, `revisa` drawn as a diamond, and the two links leaving it labelled

### Requirement: State machine

`type: "state"` SHALL declare `states` (items with `id`, each MAY declare `initial: true`, `final: true`, `row` and `col`) and `transitions` (`{ from, to, label?, kind? }`). It SHALL be laid out as a flowchart with states drawn as rounded rectangles, an initial state preceded by a filled dot and a final state followed by a ringed dot, and a transition whose `from` equals its `to` drawn as a self-loop. Budget: 8 states, 14 transitions. Text version: one line per transition.

#### Scenario: Retry loop

- **WHEN** the state `retrying` has a transition to itself labelled "FALLO"
- **THEN** it SHALL be drawn as a self-loop on `retrying` labelled "FALLO"

### Requirement: Tree and org chart

`type: "tree"` SHALL declare `nodes` (items with `id`, each but one declaring `parent`, the id of another node). The node without `parent` SHALL be the root; none or more than one root, or a cycle, SHALL be reported and the tree SHALL NOT render. It MAY declare `direction` (`down`, the default, or `right`). The platform SHALL lay it out as a tidy tree: parents centred over their children, siblings in written order, and elbow connectors. `type: "org-chart"` SHALL be a tree whose nodes MAY also declare `role` (drawn as the item's tag) and `dotted` (ids of secondary reporting lines, drawn as dashed connectors). Budget: 4 levels, 16 nodes, 6 children per node. Text version: the nested list of the nodes.

#### Scenario: Two roots

- **WHEN** a tree has two nodes without `parent`
- **THEN** it SHALL be reported naming both, and a notice SHALL render in its place

### Requirement: Dependency graph

`type: "dependency"` SHALL declare `nodes` (items with `id`) and `deps` (`{ from, to, label?, kind? }`, `from` depending on `to`). Each node's rank SHALL be the length of its longest dependency chain, ranks drawn as rows from the nodes nothing depends on down to the ones that depend on nothing, ordered within a rank to reduce crossings. A cycle SHALL be drawn with its edges in the accent and dashed back-edges, and SHALL be listed in the text version. Budget: 9 nodes, 14 deps, 4 ranks, 1 cycle. Text version: one line per node, "<node> depende de <names>".

#### Scenario: Shared dependency

- **WHEN** `web` and `worker` both depend on `db`
- **THEN** `db` SHALL be in a rank below both, with two edges reaching it

### Requirement: Sequence diagram

`type: "sequence"` SHALL declare `actors` (items with `id`, drawn left to right as headed lifelines) and `messages` (`{ from, to, label, kind? }`, `kind` being `call` (solid, filled head, the default), `return` (dashed, open head), `async` (solid, open head) or `accent` (the headline path)), drawn top to bottom in order; a message whose `from` equals its `to` SHALL be a self-call. It MAY declare `fragments` (`{ kind, label?, first, last, else? }`, `kind` being `alt`, `opt`, `loop` or `par`, `first`/`last`/`else` being message indexes), drawn as a framed region with its kind in a tab; fragments SHALL nest at most one level, and overlapping fragments SHALL be reported. Budget: 6 actors, 14 messages, 3 fragments. Text version: the numbered messages "<n>. <from> → <to>: <label>", with each fragment's kind and label before its first message.

#### Scenario: Return message

- **WHEN** message 1 goes from `api` to `db` and message 2 from `db` to `api` with `kind: "return"`
- **THEN** message 2 SHALL be drawn dashed under message 1, pointing back to the `api` lifeline

### Requirement: Timeline

`type: "timeline"` SHALL declare `events` (items with `date`) and MAY declare `spans` (`{ name, start, end, hue? }`) and `scale` (`time`, the default, placing events proportionally to their dates, or `even`, spacing them equally in date order). Events SHALL be drawn as ticks on a horizontal axis with their labels alternating above and below so none overlap, a focal event in the accent, and spans as bands along the axis. Budget: 12 events, 4 spans. Text version: the events in date order, "<date>: <name>".

#### Scenario: Proportional spacing

- **WHEN** a timeline has events on 2026-01-01, 2026-02-01 and 2026-07-01
- **THEN** the gap between the second and third ticks SHALL be about five times the gap between the first and second

### Requirement: Gantt chart

`type: "gantt"` SHALL declare `phases` (`{ name, tasks }`, each task an item with `start` and `end`, or with `milestone` (a date) instead) and MAY declare `today` (a date, drawn as a dashed vertical line). The axis SHALL span from the earliest start to the latest end, with ticks per week up to 10 weeks and per month beyond. Each task SHALL be a bar in its phase's band, a milestone a diamond. A task ending before it starts SHALL be reported. Budget: 5 phases, 16 tasks. Text version: per phase, "<task>: <start> – <end>".

#### Scenario: Monthly ticks

- **WHEN** a Gantt spans from 2026-01-05 to 2026-06-30
- **THEN** its axis SHALL show one tick per month from January to June

### Requirement: Swimlane and process

`type: "swimlane"` SHALL declare `lanes` (items with `id`, drawn as horizontal bands with their name on the left) and `steps` (items with `id` and `lane`, MAY declare `kind` (`step` or `decision`) and `col`), with `links` as a flowchart's. Without `col`, a step's column SHALL be its longest distance from the first step. `variant: "process"` SHALL also accept on each step `inputs`, `outputs` and `tools` (lists of short texts), drawn as chips under the step. Budget: 5 lanes, 12 steps, 16 links. Text version: the steps per lane, then the links.

#### Scenario: Handoff

- **WHEN** step `pide` is in lane `cliente` and step `prepara` in lane `cocina`, with a link between them
- **THEN** the link SHALL cross from one band to the other, `prepara` one column right of `pide`

### Requirement: Kanban

`type: "kanban"` SHALL declare `columns` (`{ name, limit?, cards }`, each card an item that MAY declare `blocked: true`). Columns SHALL be drawn side by side with their name and card count, cards stacked in order, a blocked card marked, and a column holding more cards than its `limit` marked over limit in the accent. A kanban SHALL have no connectors. Budget: 5 columns, 4 cards per column, 12 cards. Text version: per column, its count, limit and cards.

#### Scenario: Over limit

- **WHEN** the column "En curso" has `limit: 2` and three cards
- **THEN** its header SHALL show "3 / 2" in the accent

### Requirement: Story map

`type: "story-map"` SHALL declare `activities` (items with `id`, the backbone, left to right), `releases` (names, top to bottom) and `stories` (items with `activity` and `release`, the release being a name in `releases`), and MAY declare `cut` (a release name: the release cut is drawn as an accent line under it). Budget: 5 activities, 3 releases, 12 stories, 4 stories per activity and release. Text version: per release, its stories per activity, and where the cut is.

#### Scenario: Release cut

- **WHEN** a story map has releases "MVP", "v2" and `cut: "MVP"`
- **THEN** an accent line SHALL be drawn between the "MVP" and "v2" rows

### Requirement: User journey

`type: "journey"` SHALL declare `stages` (items, left to right, each declaring `sentiment`, one of `muy-mal`, `mal`, `neutral`, `bien` and `muy-bien`, and MAY declare `actions`, `thoughts` and `touchpoints` (lists of short texts) and `pain` (a short text)). Stages SHALL be columns with their rows of texts, and the sentiments a curve across them on five named levels; a stage with `pain` SHALL carry a dashed accent marker. Budget: 6 stages, 3 rows of texts, 2 pains. Text version: per stage, its sentiment, texts and pain.

#### Scenario: Sentiment curve

- **WHEN** three stages have sentiments `bien`, `mal` and `muy-bien`
- **THEN** the curve SHALL dip at the second stage and peak at the third

### Requirement: Quadrant and Wardley map

`type: "quadrant"` SHALL declare `x` and `y` (`{ label, low, high }`), `quadrants` (four names, top-left, top-right, bottom-left, bottom-right) and `items` (items with `x` and `y` between 0 and 100), drawn as dots with labels placed so none overlap. Budget: 12 items. `type: "wardley"` SHALL declare `components` (items with `id`, `visibility` and `evolution` between 0 and 100) and MAY declare `links` (`{ from, to }`) and `moves` (`{ id, to }`, the evolution a component is heading to, drawn as a dashed accent arrow); the x axis SHALL be split into Génesis, A medida, Producto and Commodity. Budget: 9 components, 12 links, 2 moves. A coordinate out of range SHALL be reported. Text version: each item with its position in words (quadrant name, or stage and visibility).

#### Scenario: Item out of range

- **WHEN** a quadrant item says `x: 120`
- **THEN** it SHALL be reported on its `x` and the item left out

### Requirement: Venn

`type: "venn"` SHALL declare `sets` (2 or 3 items with `id`) and MAY declare `regions` (`{ sets, label }`, `sets` being 2 or more set ids, the label of that intersection). Sets SHALL be drawn as overlapping translucent circles of equal size with their names outside, and region labels inside their intersection. Budget: 3 sets. Text version: the sets, then each region as "<set> ∩ <set>: <label>".

#### Scenario: Centre region

- **WHEN** a three-set Venn has a region of all three sets labelled "Ikigai"
- **THEN** "Ikigai" SHALL be drawn in the area shared by the three circles

### Requirement: Pyramid, funnel and layers

`type: "pyramid"` SHALL declare `levels` (items, top to bottom), drawn as stacked trapezoids narrowing upwards. `variant: "funnel"` SHALL draw them narrowing downwards, and when every level has `value`, each level's width SHALL follow its value and the drop-off percentage from the previous level SHALL be drawn beside it. Budget: 6 levels. `type: "layers"` SHALL declare `layers` (items, top to bottom, each MAY declare `items`, short texts drawn as chips inside it), drawn as full-width stacked bands. Budget: 7 layers, 6 chips per layer. Text version: the levels or layers in order, with values and drop-offs.

#### Scenario: Funnel drop-off

- **WHEN** a funnel's levels have the values 1000, 400 and 100
- **THEN** the second level SHALL be labelled "−60 %" and the third "−75 %"

### Requirement: Loop

`type: "loop"` SHALL declare `steps` (3 to 8 items, clockwise from the top) and MAY declare `hub` (an item at the centre) and `writes` (the indexes of steps that write back to the hub, drawn as dashed lines to it). Steps SHALL sit evenly on a ring joined by curved arrows, the last arrow closing the loop. Budget: 8 steps. Text version: the steps as a cycle ending back at the first, then the hub and what writes to it.

#### Scenario: Closing arrow

- **WHEN** a loop has four steps
- **THEN** four arrows SHALL be drawn, the last from the fourth step to the first

### Requirement: Fishbone

`type: "fishbone"` SHALL declare `effect` (an item, the head on the right) and `categories` (`{ name, causes, root? }`, `causes` being short texts, `root: true` marking the root-cause bone in the accent), bones alternating above and below the spine. Budget: 5 categories, 3 causes per category, 18 causes. Text version: the effect, then each category with its causes.

#### Scenario: Root cause

- **WHEN** the category "Configuración" says `root: true`
- **THEN** its bone and label SHALL be drawn in the accent

### Requirement: Matrix

`type: "matrix"` SHALL declare `rows` and `columns` (items), `levels` (2 to 5 names, from least to most, such as "Sin acceso", "Lectura", "Escritura", "Admin") and `cells` (one list per row, one level name or `null` per column). Cells SHALL be drawn as a grid shaded by level, each with its level's short name, and the legend SHALL list the levels. A row whose cell count differs from the columns, or an unknown level, SHALL be reported. Budget: 10 rows, 8 columns. Text version: a Markdown table.

#### Scenario: Unknown level

- **WHEN** `levels` is `["Lectura", "Escritura"]` and a cell says "Borrar"
- **THEN** it SHALL be reported on that cell and the cell drawn empty

### Requirement: Bar and waterfall

`type: "bar"` SHALL declare `categories` (names) and `series` (1 or 2 `{ name, values, hue? }`, one value per category) and MAY declare `orientation` (`vertical`, the default, or `horizontal`) and `focal` (a category name, drawn in the accent). The value axis SHALL start at zero (or include it) and end at a round number at or above the largest value, with 4 to 6 ticks. `variant: "dumbbell"` SHALL require 2 series and draw each category as two dots joined by a line. `type: "waterfall"` SHALL declare `start` (`{ name, value }`) and `steps` (`{ name, delta }`) and MAY declare `end` (a name, "Total" by default); bars SHALL float from the running total, rises and falls told apart, and the end bar SHALL show the computed total. Budgets: 12 categories; 10 steps. A series with a value count different from the categories SHALL be reported. Text version: a Markdown table of the values (the waterfall's with its running total).

#### Scenario: Round axis

- **WHEN** a bar chart's largest value is 870
- **THEN** its axis SHALL end at 1000 and be labelled every 200

### Requirement: Line charts

`type: "line"` SHALL declare `x` (labels or dates, in order) and `series` (`{ name, values, hue?, focal? }`, one value per `x`). Plain lines SHALL share one axis with round ticks, each series labelled at its last point. `variant: "slope"` SHALL require exactly 2 `x` and draw each series as a line between two columns with its values. `variant: "ridgeline"` SHALL draw each series as its own filled curve stacked downwards. `variant: "stream"` SHALL stack the series around a centred baseline. `variant: "bump"` SHALL take ranks (positive integers) instead of values and draw them with rank 1 on top. Budgets: 24 points per series; 4 series (8 for `bump` and `ridgeline`). Text version: a Markdown table with one column per series.

#### Scenario: Slope with three points

- **WHEN** a `slope` line declares three `x`
- **THEN** it SHALL be reported saying a slope chart compares exactly two points, and SHALL render as a plain line chart

### Requirement: Scatter charts

`type: "scatter"` SHALL declare `x` and `y` (`{ label, min?, max? }`) and `points` (`{ name?, x, y, group?, size?, focal?, info? }`). Points SHALL be drawn as dots on round axes, coloured by `group` with a legend, and only focal points and points with `name` labelled, labels placed so none overlap. `variant: "bubble"` SHALL scale each dot's area by its `size`. `variant: "beeswarm"` SHALL ignore `y`, lay the dots along `x` in one row per `group` and push them apart so none overlap. Budgets: 60 points, 6 labels, 5 groups. Text version: a Markdown table of the points.

#### Scenario: Bubble area

- **WHEN** a bubble chart has points with `size` 1 and 4
- **THEN** the second bubble's radius SHALL be twice the first's

### Requirement: Heatmap

`type: "heatmap"` SHALL declare `rows` and `columns` (names) and `values` (one list of numbers or `null` per row), and MAY declare `focal` (`[row, column]` indexes). Each cell SHALL be shaded by its value on a single-hue ramp from the smallest to the largest value, never invisible against the paper, the focal cell in the accent, a `null` cell left empty. Budget: 12 rows, 12 columns. Text version: a Markdown table.

#### Scenario: Ramp

- **WHEN** a heatmap's values go from 0 to 50
- **THEN** a cell of 0 SHALL be the palest visible shade and a cell of 50 the darkest

### Requirement: Treemap and marimekko

`type: "treemap"` SHALL declare `items` (items with a positive `value` and MAY declare `group`), laid out as squarified rectangles whose areas follow their values, grouped by `group` with a framed group label, each labelled with its name and value when it fits. `variant: "marimekko"` SHALL instead declare `columns` (`{ name, parts }`, each part `{ name, value }`): column widths follow their totals, and each column is split by its parts. Budgets: 16 items; 6 columns, 5 parts per column. A value that is not positive SHALL be reported. Text version: the items with their values and shares of the total.

#### Scenario: Areas

- **WHEN** a treemap has items valued 3 and 1
- **THEN** the first rectangle's area SHALL be three times the second's

### Requirement: Radar and polar charts

`type: "radar"` SHALL declare `axes` (3 to 6 names), `max` (the top of the scale) and `series` (1 to 5 `{ name, values, hue?, focal? }`, one value per axis), drawn as polygons on concentric rings. `type: "polar"` SHALL declare `categories` (4 to 8 names, clockwise from the top) and `values` (one per category), drawn as wedges whose radius follows the value; `variant: "lollipop"` SHALL draw a line and dot per category instead. A value above `max` or below zero SHALL be reported. Budgets as stated. Text version: a Markdown table.

#### Scenario: Value above the scale

- **WHEN** a radar has `max: 5` and a value 7
- **THEN** it SHALL be reported on that value and drawn at 5

### Requirement: Sankey

`type: "sankey"` SHALL declare `columns` (2 or 3 lists of items with `id`, left to right) and `flows` (`{ from, to, value, focal? }`, from a node to a node in the next column). Node heights and ribbon thicknesses SHALL use one scale for the whole diagram, ribbons SHALL leave and reach their bars horizontally, and focal flows SHALL be drawn in the accent over the others. A middle-column node whose incoming and outgoing totals differ SHALL be reported. A flow skipping a column or going backwards SHALL be reported and left out. Budget: 3 columns, 8 nodes, 12 flows. Text version: one line per flow, "<from> → <to>: <value>".

#### Scenario: Leaking node

- **WHEN** the middle node `tests` receives 5200 and sends out 5000
- **THEN** it SHALL be reported saying `tests` receives 5.200 and sends 5.000

### Requirement: Architecture delta

`type: "architecture-delta"` SHALL declare `before` and `after`, each a drawn diagram's `width`, `height`, `nodes`, `edges`, `zones` and `notes` (`content-diagrams`), and MAY declare `changes` (`{ id, note }`, the reason for a piece's change). The platform SHALL compare both by box id and SHALL classify each box as added, removed, changed (its name, sub, kind, tag, shape or hue differ), moved (its zone differs) or unchanged, and each connection (by `from` and `to`) as added, removed or rewired. It SHALL draw "Antes" and "Después" side by side, removed boxes dashed in "Antes", added and changed boxes marked in "Después", and between them a "Cambios" ledger listing each change with its mark and note. A `changes` id that is no box SHALL be reported. Text version: the ledger.

#### Scenario: Extracted service

- **WHEN** `before` has the box `monolito` and `after` has `monolito` and `facturacion`, with a new edge `monolito → facturacion`
- **THEN** the ledger SHALL list `facturacion` as added and the connection `monolito → facturacion` as added, and `monolito` as unchanged
