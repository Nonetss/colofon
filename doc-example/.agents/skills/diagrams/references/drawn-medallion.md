# Medallion (drawn)

**Best for:** the storage tiers of the **same data** at rising quality:
raw → anonymised → clean → aggregated → archive (bronce, plata, oro). Per
tier, what it holds, the tool that writes it and the format; per arrow, what
promotes data from one tier to the next.

**Not for:** a workflow with roles ([data flow](drawn-data-flow.md) or
`swimlane`); the cluster that runs it ([high-level](drawn-high-level.md));
abstraction levels with no data moving between them (`layers`); quantities
moving between stages (`sankey`).

## Composition

- **One box per tier, left → right, in one row.** That is exactly a chain:
  `items` and `links`, no coordinates. Draw it with `nodes` only when you
  need a zone (for example a `CONSULTA` zone around the queried tiers) or
  notes.
- **Tier box:** `name` the tier (`Bronce`, `Oro`), `tag` the bucket or
  short id (`raw`, `gold`), and `sub` as a list of up to three lines: the
  tool that writes it, the format, and a concrete example of what is in it
  (`con datos personales`, `indicadores`). Without the example the diagram
  turns abstract. With a tag and three sub lines the row needs `"h": 104`.
- **Tiers are `store`**; the archive is `optional` (dashed, cold).
- **Arrows are promotions**, labelled with the operation in one word
  (`ANONIMIZA`, `LIMPIA`, `AGREGA`, `CADUCA`), always forward. The move into
  the archive is `dash`.
- **The accent: one focal tier**, the one consumers query (usually the
  aggregated one), and the promotion into it as `accent`. In a chain:
  `"kind": "focal"` on that item and its link's index in `accent`.
- Rename the legend: `"kindNames": { "store": "Capa", "focal": "Capa que se
  consulta", "optional": "Archivo frío" }`.

## Skeleton

```json
{
  "title": "Las capas de los datos de la encuesta",
  "desc": "Los datos de la encuesta pasan de bronce a oro, cada capa más limpia que la anterior, y acaban en el archivo",
  "items": [
    { "id": "bronze", "tag": "raw", "name": "Bronce", "kind": "store", "sub": ["NiFi", "CSV · JSON", "con datos personales"] },
    { "id": "silver", "tag": "clean", "name": "Plata", "kind": "store", "sub": ["Trino", "Iceberg", "limpio y anónimo"] },
    { "id": "gold", "tag": "gold", "name": "Oro", "kind": "focal", "sub": ["Trino", "Iceberg", "indicadores"] },
    { "id": "archive", "tag": "cold", "name": "Archivo", "kind": "optional", "sub": ["MinIO", "inmutable", "5 años"] }
  ],
  "links": ["ANONIMIZA", "AGREGA", "CADUCA"],
  "accent": [1],
  "dash": [2],
  "h": 104,
  "kindNames": { "store": "Capa", "focal": "Capa que se consulta", "optional": "Archivo frío" }
}
```

The platform sizes each tier to its longest line (at least 120 px) and each
gap to its label, and sizes the drawing; the text version is the chain:
"Bronce → Plata: ANONIMIZA", …

## Budget

Advice; the platform checks only the accents.

| Limit | Value |
| --- | --- |
| Tiers | 6 |
| Sub lines per tier | 3 |
| Promotion label | 14 characters |
| Focal tiers | 1 |
| Accent elements | 2 (the focal tier, and the promotion into it) |

More than six tiers → the extra ones are probably sub-steps of a tier; say
them in its `info`.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| More than one focal tier | The point is which tier is queried |
| Arrows going back (an aggregate writing to raw) | Promotions only move forward; that is another diagram |
| The archive styled like a live tier | `optional` (dashed) is what says "cold" |
| Labels like "CALCULA Y RESUME" | One verb; the detail goes in `info` on the link's target |
| Tier contents written on the arrows | Arrows say how data moves; what a tier holds goes in its `sub` |
| No example line in the tiers | Without a concrete payload the tiers are just names |
| A hue per tier | Tiers are one dataset; the accent alone marks the queried one |

Planning, measurements and every key: [drawn.md](drawn.md).
