# Fishbone (`"type": "fishbone"`)

**Best for:** the causes of one observed effect, grouped by category, as in a
post-incident analysis or a "why does this keep happening" page. The reader
sees what was investigated and which category holds the confirmed root cause.

**Not for:** a chain of things that happened in order (use `timeline` or
`sequence`), a diagnosis the reader walks through question by question (use
`flowchart`), or a plain list of causes with no grouping (write a list).

## The file

```json
{
  "type": "fishbone",
  "title": "Por qué una página sale en «Otros»",
  "desc": "Las causas de que una página acabe en el último grupo de la barra lateral",
  "effect": { "name": "La página sale en «Otros»", "sub": "y se avisa en ella", "page": "repository/menu" },
  "categories": [
    { "name": "Menú", "root": true, "causes": ["Ninguna entrada la nombra", "La ruta tiene una errata", "Su carpeta no está"] },
    { "name": "Declaración", "causes": ["menu.yaml mal formado", "Un icono que no existe"],
      "info": "Con el menú roto se sigue usando la última versión válida" },
    { "name": "Sincronización", "causes": ["El cambio no se ha subido", "Aún no se ha sincronizado"] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `effect` | Required. The observed effect, one item (see [items.md](items.md)): the head, on the right. |
| `categories` | Required. `{ "name", "causes", "root", "hue", "info" }`: `name` required; `causes` a list of short texts; `root: true` on the confirmed root cause; `hue` and `info` as for items. Categories are not items: no `id`, `sub`, `entity` or `page`. |

## What the platform does

- Draws the effect as a box on the right and a spine running into it from
  the left with an arrowhead.
- Draws one bone per category, attached every 160px along the spine, leaning
  back at 60°, alternating above and below: the first category is the bone
  nearest the head, above.
- Writes the category's name in a tag at the bone's far end, and each cause
  as a short tick along the bone with its text to the left, spaced evenly.
- The `root` category's bone is bold in the accent, with an accent tag; the
  legend then shows "Causa raíz". A `hue` colours the bone and tag.
- Hovering a tag shows the category, its number of causes ("2 causas") and
  `info`. Causes are plain text: no links, no hover.

## What you decide

- **The effect is what was observed**, a symptom ("La página sale en
  «Otros»"), never the fix ("Añadir la página al menú").
- **Name categories from the investigation**, not from a generic template
  (the six M's left half empty).
- **Causes say something the category doesn't.** "Menú → problema del menú"
  adds nothing.
- **One root cause**, when it is confirmed. Leave `root` out while it isn't.
- **Order categories by closeness**: the first sits nearest the effect, where
  the reader looks first; put the root cause there.

## Complexity budget

| Limit | Value |
| --- | --- |
| Categories | 5 |
| Causes per category | 3 |
| Causes in total | 18 |
| Accent elements | 2 (the root bone and a focal effect) |

Over budget → split by subsystem into two fishbones, or move the detail of
one category into its own page.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| The effect phrased as a solution | The diagram is about what was seen, not what to do |
| Two categories with `root` | Two root causes are two diagrams, or one merged cause |
| A category with no causes | A placeholder, not a finding; drop it until there is one |
| Causes that restate their category | A tick that adds no information |
| A chronology as bones | Order in time is a `timeline` |
| Long causes | Ticks are short; the explanation goes in the category's `info` or the page |

## Reported

A missing or invalid `effect` (nothing is drawn), a category without `name`,
more than 5 categories, more than 3 causes in one category, more than 18 in
all, and more than two accents.

## Text version

"Efecto: La página sale en «Otros»", then a tree: each category ("Menú (causa
raíz)") with its causes under it.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/fishbone-others-group.json`, in its `diagrams/concepts` page.
