# content-diagrams Specification

## Purpose
Lets a content repository declare diagrams as YAML files under `diagramas/`, validated against its catalog and shown in any page with a component, so a diagram is written once and reused.

## Requirements

### Requirement: Diagram files

A content repository MAY hold a `diagramas/` folder with one `<id>.yaml` file per diagram, where the id is made of lowercase letters, digits and single hyphens; a `.yml` file or a badly named file SHALL be reported. A diagram SHALL declare `titulo` (required text), `descripcion` (required text: what the diagram shows, used as its text alternative), `direccion` (optional, `derecha` or `abajo`, `derecha` by default), `nodos` (required, at least one), `conexiones` (optional) and `zonas` (optional). Any other key SHALL be reported.

#### Scenario: A valid diagram

- **WHEN** `diagramas/komodo.yaml` declares `titulo`, `descripcion`, the nodes `komodo` and `periphery` and the connection `komodo -> periphery: deploy`
- **THEN** the diagram `komodo` SHALL be valid

#### Scenario: Missing description

- **WHEN** `diagramas/red.yaml` has no `descripcion`
- **THEN** it SHALL be reported on `diagramas/red.yaml` saying `descripcion` is required

### Requirement: Nodes, connections and zones

`nodos` SHALL map node ids (lowercase letters, digits and single hyphens) to a node: either a text (its name), or an object with exactly one of `entidad` (`<type>/<id>` of an existing entity, which gives the node its name, icon and link) or `nombre` (text), plus optional `sub` (a short line under the name), `icono` (a Lucide icon name) and `tipo` (`entrada` or `almacen`). `conexiones` SHALL be a list whose items are `<from> -> <to>` written as text, or a one-key map from `<from> -> <to>` to the connection's label; both ends SHALL be declared node ids. `zonas` SHALL map zone ids to `titulo` (required text) and `nodos` (a non-empty list of declared node ids); a node SHALL be in at most one zone. Every problem SHALL be reported on the diagram's file with the field path, and the parts that are valid SHALL still render.

#### Scenario: Entity that does not exist

- **WHEN** a node says `entidad: machines/old-01` and `machines` has no `old-01`
- **THEN** the diagram SHALL be reported on `nodos.<node>.entidad` naming `machines/old-01`, and the node SHALL render with its id as name

#### Scenario: Connection to an undeclared node

- **WHEN** a diagram lists `komodo -> stacks: compose up` and declares no `stacks` node
- **THEN** the diagram SHALL be reported on that connection naming `stacks`, and the connection SHALL be left out

#### Scenario: Node in two zones

- **WHEN** the node `nas` is listed in the zones `home` and `outside`
- **THEN** the diagram SHALL be reported naming `nas` and both zones

### Requirement: Diagram component

`<Diagram id="…" />`, written as a block, SHALL render the diagram `diagramas/<id>.yaml` in the page. A missing `id`, an id with no diagram file, an attribute other than `id` or an attribute value in braces SHALL be reported with the component's line, and a missing diagram SHALL render a notice in its place. A `<Diagram>` inside a paragraph's text SHALL be reported as needing its own block and rendered as a notice. The same diagram MAY be shown in any number of pages.

#### Scenario: Shown in two pages

- **WHEN** the pages `index` and `containers/komodo` both hold `<Diagram id="komodo" />`
- **THEN** both SHALL show the diagram `komodo` and no problem SHALL be reported

#### Scenario: Unknown diagram

- **WHEN** a page holds `<Diagram id="mapa" />` and there is no `diagramas/mapa.yaml`
- **THEN** the page SHALL be reported on that line naming `mapa`, and a notice SHALL render where the diagram would be

### Requirement: How a diagram renders

Until the platform draws diagrams, a diagram SHALL render as a figure captioned with its `titulo` and `descripcion`, holding its zones (each with its title and nodes) and its connections as text, one per line as "<from name> → <to name>: <label>", where an entity node's name links to the entity's page, or to its generated catalog page when it has none. The same text SHALL be its Markdown in `llm.txt`.

#### Scenario: Text version

- **WHEN** a page shows the diagram `komodo`, whose node `komodo` is `entidad: services/komodo` with `page: containers/komodo`, connected to `periphery` (`nombre: Periphery`) with the label "deploy"
- **THEN** the figure SHALL be captioned with the diagram's title and description and SHALL hold the line "Komodo → Periphery: deploy", with "Komodo" linking to the page `containers/komodo`

### Requirement: Diagrams are read with the pages

Diagram files SHALL be read when the pages are, from the same checkout, and their problems SHALL be reported per file and logged with the pages' problems. Every page that shows a diagram SHALL also report that diagram's problems, naming the diagram's file, as it reports the invalid entities of an `<Entities>` table. A broken diagram SHALL NOT stop any page or other diagram from being read.

#### Scenario: One broken diagram

- **WHEN** `diagramas/red.yaml` holds a YAML syntax error and `diagramas/komodo.yaml` is valid
- **THEN** `diagramas/red.yaml` SHALL be reported with its line and column, pages showing `komodo` SHALL render it, and pages showing `red` SHALL show a notice
