## MODIFIED Requirements

### Requirement: How a diagram renders

A diagram SHALL render as a figure holding a drawing laid out by the platform (the content never gives positions), in the style of the reader's diagrams: framed on the card's colour, nodes as outlined boxes with their name centred over their `sub` in a monospace face, connections as thin arrows with rounded corners and their labels in a monospace face on a mask, zones as dashed frames titled in small capitals. It SHALL show:
- each node as a box with its name, its `sub` under it and its icon (the entity type's icon for an entity node without `icono`), styled by its `tipo`: `entrada` as an origin, `almacen` as a cylinder for data, neither as a plain piece; an entity node SHALL link to the entity's page, or to its generated catalog page when it has none;
- each connection as an arrow from its `<from>` node to its `<to>` node, with its label, wrapped on several lines when long, on the arrow when it has one;
- each zone as a titled frame around its nodes;
- the flow laid out left to right for `direccion: derecha` and top to bottom for `direccion: abajo`, following the order in which nodes and connections are written, so that when connections loop, the one written against that order is the one drawn backwards;
- a legend under the drawing, naming each kind of node used and the arrow, when the diagram uses more than one kind of node.

The drawing SHALL follow the reader's light or dark theme, SHALL shrink to the column's width (and keep its size, scrolling sideways, on narrow screens) and SHALL open enlarged like the page's images. The drawing SHALL be marked as an image described by the diagram's `titulo` and `descripcion`. A drawn diagram SHALL show nothing but its drawing: its caption (`titulo` and `descripcion`) and its text version (its zones, each with its title and nodes, and its connections, one per line as "<from name> → <to name>: <label>", with entity names linked as in the drawing) SHALL stay in the page for assistive technology, hidden from sight. When a diagram could not be laid out, its caption and text version SHALL be shown instead. The same diagram SHALL be laid out the same way every time it is read. The caption and text version SHALL be the diagram's Markdown in `llm.txt`, without the drawing.

#### Scenario: Text version

- **WHEN** a page shows the diagram `komodo`, whose node `komodo` is `entidad: services/komodo` with `page: containers/komodo`, connected to `periphery` (`nombre: Periphery`) with the label "deploy"
- **THEN** the figure SHALL be captioned with the diagram's title and description and its text version SHALL hold the line "Komodo → Periphery: deploy", with "Komodo" linking to the page `containers/komodo`

#### Scenario: Drawn diagram

- **WHEN** a page shows the diagram `pipeline`, with six nodes, five labelled connections, the zones "Tu lado" and "La plataforma" and `direccion: derecha`
- **THEN** the figure SHALL hold a drawing with six node boxes, five arrows each carrying its label, two titled zone frames each enclosing its nodes and a legend naming "Pieza", "Origen", "Datos" and "Conexión", laid out left to right, and SHALL show no caption or text version

#### Scenario: Entity node in the drawing

- **WHEN** a diagram's node `komodo` is `entidad: services/komodo` and the entity has no `page`
- **THEN** the node's box SHALL link to the generated page `catalogo/services/komodo`

#### Scenario: Markdown without the drawing

- **WHEN** an agent reads the `llm.txt` of a page showing `komodo`
- **THEN** the diagram SHALL appear as its caption followed by its zones and connections as text, and nothing of the drawing
