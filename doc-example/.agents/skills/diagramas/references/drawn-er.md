# Entity-relationship (drawn)

**Best for:** a conceptual or logical data model: the entities of a domain,
their key fields and how they relate, with the **cardinality** of each
relationship. API resources, a domain model, "what is a repository made of".

**Not for:** the physical schema with SQL types, constraints and foreign
keys column to column ([database schema](drawn-db-schema.md)); classes with
operations and inheritance ([UML class](drawn-uml-class.md)); a catalog type
that already exists in `catalogo/` (link its entities, or show its table
with `<Entities>`); what depends on what (`dependency`).

## Composition

- **Each entity is a table box** (`rows`, no `h`) with `"tag": "Entidad"`:
  the name on top, then a few fields, `key: "PK"` on the identifier and
  `"FK"` on references. No types, or only the conceptual ones: types are the
  schema diagram's job.
- **Relationships join boxes, not columns**: an arrow from side to side,
  `noHead: true` (a relationship has no direction), labelled with the
  cardinality and, if it helps, the verb: `1 : N CONTIENE`, `N : M CITA`.
  The label is the only place for cardinality: one label per relationship,
  both ends in it.
- **Lay out by cluster** so most relationships are one straight line or one
  elbow: related entities side by side or one above the other, sharing a
  row or a column.
- **The accent is the aggregate root** or central entity: one `focal`
  table. Relationships stay default.
- Rename the legend for the reading: `"kindNames": { "focal": "Raíz del
  modelo", "service": "Entidad" }`, `"edgeNames": { "default": "Relación
  (cardinalidad)" }`. The legend's arrow sample keeps its head even with
  `noHead`; the name fixes the meaning.
- An entity that exists in the catalog can link to it: `entity` on its
  table.

## Skeleton

```json
{
  "title": "Qué guarda un repositorio",
  "desc": "Un repositorio contiene páginas, entidades y diagramas; las páginas citan entidades y muestran diagramas",
  "width": 616,
  "height": 284,
  "nodes": [
    { "id": "repository", "name": "Repositorio", "tag": "Entidad", "x": 24, "y": 24, "w": 192,
      "rows": [{ "key": "PK", "name": "slug" }, { "name": "nombre" }, { "name": "url" }] },
    { "id": "page", "name": "Página", "tag": "Entidad", "kind": "focal", "x": 400, "y": 24, "w": 192,
      "rows": [{ "key": "PK", "name": "ruta" }, { "key": "FK", "name": "repositorio" }, { "name": "título" }] },
    { "id": "entity", "name": "Entidad", "tag": "Entidad", "x": 24, "y": 176, "w": 192,
      "rows": [{ "key": "PK", "name": "clave" }, { "key": "FK", "name": "repositorio" }, { "name": "tipo" }] },
    { "id": "diagram", "name": "Diagrama", "tag": "Entidad", "x": 400, "y": 176, "w": 192,
      "rows": [{ "key": "PK", "name": "id" }, { "key": "FK", "name": "repositorio" }, { "name": "título" }] }
  ],
  "edges": [
    { "from": "repository", "to": "page", "noHead": true,
      "points": [[216, 66], [400, 66]], "label": "1 : N CONTIENE", "at": [308, 56] },
    { "from": "repository", "to": "entity", "noHead": true,
      "points": [[120, 108], [120, 176]], "label": "1 : N", "at": [132, 146], "anchor": "start" },
    { "from": "page", "to": "entity", "noHead": true,
      "points": [[400, 92], [308, 92], [308, 218], [216, 218]], "label": "N : M CITA", "at": [320, 160], "anchor": "start" },
    { "from": "page", "to": "diagram", "noHead": true,
      "points": [[496, 108], [496, 176]], "label": "N : M MUESTRA", "at": [508, 146], "anchor": "start" }
  ],
  "kindNames": { "focal": "Raíz del modelo", "service": "Entidad" },
  "edgeNames": { "default": "Relación (cardinalidad)" }
}
```

A 2 × 2 grid: tables 192 wide with three rows are 84 tall
(`36 + 14·3 + 6`), so a column's vertical relationship runs from y 108 to
176. The diagonal relationship takes one elbow pair through the middle
gutter.

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Entities | 8 |
| Fields per entity | 6 (more: `more`, "+ 4 campos más") |
| Relationships | 10 |
| Accent elements | 1 (the root) |

Over budget → one diagram per cluster (aggregate), each with its root
focal.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A line for every foreign key in a large model | Tangle; lay out by cluster and split |
| Cardinality written differently at each end | One notation, both ends in one label (`1 : N`) |
| Arrow heads on relationships | A relationship has no direction; use `noHead` |
| SQL types and constraints on every field | That is the [schema diagram](drawn-db-schema.md) |
| Lines from column to column | ER joins entities; column-level is the schema diagram |
| Tables padded to equal height | Height follows rows; the platform sets it, don't fake rows |
| Retyping a catalog type as a table | Link the entity or show the catalog's own table |

Planning, measurements and every key: [drawn.md](drawn.md).
