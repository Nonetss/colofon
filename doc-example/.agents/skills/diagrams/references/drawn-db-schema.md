# Database schema (drawn)

**Best for:** the **physical** schema of a subsystem: real tables, real SQL
types, the constraints that matter and foreign keys that connect **one
column to another**, labelled with what happens on delete. A migration
review, "what goes when a row is deleted".

**Not for:** what an entity *is* and how entities relate conceptually
([ER](drawn-er.md)); classes and operations ([UML class](drawn-uml-class.md));
a whole database dump (split into subsystems first).

## Composition

- **Each table is a table box** (`rows`, no `h`), named with its real name
  (`pages`, or `public.pages` outside the default schema), `"tag":
  "Tabla"`. Each row: `key` (`PK`, `FK`, `UQ`), the column `name`, its SQL
  `type` (`uuid`, `text`, `timestamptz`, `numeric(12,2)`). The type is half
  the content: never leave it out.
- **Show the columns of the story**, not all of them; say how many are
  hidden with `more` (`"+ 6 columnas más"`).
- **Foreign keys run column to column.** Row *i* of a table at `y` has its
  middle at **`y + 42 + 14·i`**: start the arrow there on the child table's
  edge and end it at the referenced row's middle on the parent's edge
  (head at the parent). Moving a table so the two rows share a `y` makes
  the arrow a straight line (the skeleton shifts `repositories` to y 38 for
  that). This is the one place to leave the 4 px grid.
- **Label every foreign key with its referential action**
  (`ON DELETE CASCADE`, `ON DELETE RESTRICT`, `ON DELETE SET NULL`). These
  labels are long (about 100 px): route the arrow so it has a stretch that
  long, or label a vertical stretch with `anchor: "start"`.
- **The accent is the destructive path:** the one `ON DELETE CASCADE` the
  story is about as an `accent` arrow, and the table it cascades into as
  `focal`. A schema with no destructive key has no accent.
- Tables of a non-default schema sit in a zone named after it (`AUTH`).
- Rename the legend: `"kindNames": { "focal": "Se borra en cascada",
  "service": "Tabla" }`, `"edgeNames": { "default": "Clave ajena",
  "accent": "Borrado en cascada" }`.

## Skeleton

```json
{
  "title": "Qué se borra con una página",
  "desc": "Borrar una página borra sus comentarios en cascada; un repositorio con páginas no se puede borrar",
  "width": 736,
  "height": 276,
  "nodes": [
    { "id": "repositories", "name": "repositories", "tag": "Tabla", "x": 24, "y": 38, "w": 200,
      "rows": [{ "key": "PK", "name": "id", "type": "uuid" }, { "key": "UQ", "name": "slug", "type": "text" }, { "name": "name", "type": "text" }],
      "more": "+ 6 columnas más" },
    { "id": "pages", "name": "pages", "tag": "Tabla", "x": 352, "y": 24, "w": 200,
      "rows": [{ "key": "PK", "name": "id", "type": "uuid" }, { "key": "FK", "name": "repository_id", "type": "uuid" },
               { "key": "UQ", "name": "path", "type": "text" }, { "name": "title", "type": "text" }],
      "more": "+ 5 columnas más" },
    { "id": "comments", "name": "comments", "tag": "Tabla", "kind": "focal", "x": 352, "y": 168, "w": 200,
      "rows": [{ "key": "PK", "name": "id", "type": "uuid" }, { "key": "FK", "name": "page_id", "type": "uuid" }, { "name": "body", "type": "text" }] }
  ],
  "edges": [
    { "from": "pages", "to": "repositories", "points": [[352, 80], [224, 80]],
      "label": "ON DELETE RESTRICT", "at": [288, 70] },
    { "from": "comments", "to": "pages", "kind": "accent",
      "points": [[552, 224], [600, 224], [600, 66], [552, 66]],
      "label": "ON DELETE CASCADE", "at": [612, 150], "anchor": "start",
      "info": "Al borrar una página se borran todos sus comentarios" }
  ],
  "kindNames": { "focal": "Se borra en cascada", "service": "Tabla" },
  "edgeNames": { "default": "Clave ajena", "accent": "Borrado en cascada" }
}
```

`pages.repository_id` is row 1 at y 24 → middle 80; `repositories.id` is
row 0, so that table sits at y 38 (38 + 42 = 80) and the key is straight.
`comments.page_id` (168 + 56 = 224) goes round the right side to
`pages.id` (24 + 42 = 66), its label on the vertical stretch.

## Budget

Advice; the platform checks only the accents and that every column fits
(`la columna "repository_id" no cabe en 160px`: widen the table).

| Limit | Value |
| --- | --- |
| Tables | 5 |
| Rows shown per table | 8 (the rest in `more`) |
| Foreign keys | 6 |
| Accent elements | 2 (the cascade, and the table it empties) |

Over budget → show the subsystem, not the database, and say so in `desc`.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Every column of every table | A schema diagram is an argument about a subsystem, not `\d+` |
| Foreign keys from box to box | That is ER; here the rows are the anchors |
| Missing types | The type is half the content |
| Unlabelled foreign keys | The `ON DELETE` behaviour is what a reviewer looks for |
| Constraint keys on every row | Mark the ones that matter (`PK`, `FK`, a meaningful `UQ`) |
| Hiding columns without `more` | The reader assumes the table is complete |
| An arbitrary table made focal when nothing cascades | No destructive key, no accent |

Planning, measurements and every key: [drawn.md](drawn.md).
