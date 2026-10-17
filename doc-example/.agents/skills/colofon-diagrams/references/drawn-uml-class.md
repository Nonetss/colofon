# UML class (drawn)

**Best for:** the static structure of an object model: classes, their
attributes and **operations**, and the typed relationships between them:
inheritance, composition (the part dies with the whole), aggregation (the
part lives on). Use it only when operations or that relationship vocabulary
are the point.

**Not for:** entities and cardinality with no behaviour ([ER](drawn-er.md));
a physical schema ([database schema](drawn-db-schema.md)); the other UML
diagrams: sequence (`sequence`), state machine (`state`), activity
(`swimlane` or `flowchart`), component ([architecture](drawn-architecture.md)),
deployment ([deployment](drawn-deployment.md)).

## Composition

- **Each class is a table box with `rows` and `ops`**: the name on top
  (`tag` for the stereotype: `Abstracta`, `Interfaz`), the attributes as
  `rows`, a hairline, then the operations as `ops`. Each line:
  `key` the visibility (`+` public, `-` private, `#` protected), `name`
  (`title`, `dibujar()`), `type` the type or return type. A class with no
  attributes still needs `rows` to carry `ops`; give it its one key field.
- **Relationships by head**, the head always at the **last point**:

  | Relationship | `from` → `to` | `head` | `kind` |
  | --- | --- | --- | --- |
  | Inheritance (extends) | child → parent | `triangle` | `default` |
  | Realisation (implements) | class → interface | `triangle` | `dash` |
  | Composition (owns) | part → owner | `diamond` | `default` |
  | Aggregation (has) | part → owner | `open-diamond` | `default` |
  | Association | either way | `arrow` | `default` |
  | Dependency (uses) | user → used | `arrow` | `dash` |

- **Multiplicity is the label** (`1..*`, `0..1`) near the part's end.
- **Hierarchies go top → down**: parents above, children in a row below,
  their inheritance arrows sharing one trunk (same last points), as the
  skeleton does.
- **The accent is the class being extended or implemented**: one `focal`
  box. Optionally its incoming inheritance arrows as `accent`; when they
  share their end they count as one run.
- The legend lists arrow *kinds*, not heads: rename the entry with
  `edgeNames` (`"Herencia, composición o agregación"`) and say in `desc`
  what the heads mean when the reader may not know UML.

## Skeleton

```json
{
  "title": "Las clases de un diagrama",
  "desc": "Dibujado y PorTipo heredan de Diagrama; un Dibujado se compone de cajas y cada caja puede apuntar a una entidad",
  "width": 600,
  "height": 468,
  "nodes": [
    { "id": "diagram", "name": "Diagrama", "tag": "Abstracta", "kind": "focal", "x": 232, "y": 24, "w": 200,
      "rows": [{ "key": "+", "name": "title", "type": "texto" }, { "key": "+", "name": "desc", "type": "texto" }],
      "ops": [{ "key": "+", "name": "dibujar()", "type": "svg" }, { "key": "+", "name": "texto()", "type": "markdown" }] },
    { "id": "drawn", "name": "Dibujado", "x": 88, "y": 200, "w": 176,
      "rows": [{ "key": "+", "name": "width", "type": "px" }, { "key": "+", "name": "height", "type": "px" }],
      "ops": [{ "key": "+", "name": "medir()", "type": "avisos" }] },
    { "id": "typed", "name": "PorTipo", "x": 400, "y": 200, "w": 176,
      "rows": [{ "key": "+", "name": "type", "type": "texto" }],
      "ops": [{ "key": "+", "name": "colocar()", "type": "escena" }] },
    { "id": "box", "name": "Caja", "x": 88, "y": 360, "w": 176,
      "rows": [{ "key": "+", "name": "id", "type": "texto" }, { "key": "+", "name": "kind", "type": "texto" }, { "key": "-", "name": "x, y, w, h", "type": "px" }] },
    { "id": "entity", "name": "Entidad", "kind": "external", "x": 400, "y": 360, "w": 176,
      "rows": [{ "key": "+", "name": "clave", "type": "texto" }, { "key": "+", "name": "página", "type": "ruta" }] }
  ],
  "edges": [
    { "from": "drawn", "to": "diagram", "head": "triangle", "points": [[176, 200], [176, 168], [332, 168], [332, 132]] },
    { "from": "typed", "to": "diagram", "head": "triangle", "points": [[488, 200], [488, 168], [332, 168], [332, 132]] },
    { "from": "box", "to": "drawn", "head": "diamond", "points": [[176, 360], [176, 294]], "label": "1..*", "at": [188, 332], "anchor": "start" },
    { "from": "entity", "to": "box", "head": "open-diamond", "points": [[400, 396], [264, 396]], "label": "0..1", "at": [332, 386] }
  ],
  "kindNames": { "focal": "Clase abstracta", "service": "Clase", "external": "De otro paquete" },
  "edgeNames": { "default": "Herencia, composición o agregación" }
}
```

`Diagrama`, with two rows and two ops, is `36 + 28 + 10 + 28 + 6 = 108`
tall, so it ends at y 132 where the shared trunk lands; `Dibujado` ends at
294, where the composition diamond sits.

## Budget

Advice; the platform checks only the accents and that every row fits.

| Limit | Value |
| --- | --- |
| Classes | 7 (4–5 is the normal size) |
| Relationships | 8 |
| Lines per compartment | 5 (more: `more`) |
| Accent elements | 2 (the focal class, and its incoming inheritance as one run) |

Over budget → one diagram per package.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Getters and setters as operations | Noise; show behaviour that matters |
| Every attribute and method | A class diagram is an argument, not a header file |
| Composition and aggregation used interchangeably | The filled diamond means the part dies with the whole |
| The diamond at the part's end | It goes at the owner: the arrow runs part → owner |
| Associations without multiplicity | Say `1`, `0..*`, `1..*` in the label |
| A class diagram with no inheritance and no operations | That is [ER](drawn-er.md) |
| Stereotype tags on every class | Only on the abstract classes and interfaces that need them |

Planning, measurements and every key: [drawn.md](drawn.md).
