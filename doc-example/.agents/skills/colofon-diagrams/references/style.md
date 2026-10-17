# The look

Every diagram is drawn by the platform with **its own theme**: you never write
colours, fonts or sizes. The same file renders in the reader's light or dark
theme, in the page and enlarged in the viewer. What you decide is the
*meaning* each piece carries; the platform turns it into paint.

## What the drawing is made of

| Element | Look |
| --- | --- |
| Paper | The card colour of the theme, behind everything. |
| Ink | Names and main lines. |
| Muted / soft | Sub lines, default arrows, guides, axes. |
| Hairlines | Separators, zone frames, grids: thin and quiet. |
| Accent | The theme's primary colour, for **one or two** things. |
| Ten hues | `rose`, `blue`, `cyan`, `violet`, `green`, `indigo`, `fuchsia`, `slate`, `teal`, `lime`, lighter in the dark theme. |
| Text | The reader's sans for names and items, its mono for sub lines, labels, ticks and values (labels in small capitals). |

No shadows, no gradients, no glow. Borders, not fills, carry structure.

## Box kinds (drawn diagrams and many typed forms)

| `kind` | Means | Looks |
| --- | --- | --- |
| `focal` | The central piece | Accent outline, accent tint |
| `service` (default) | A working piece | Ink outline on the surface colour |
| `store` | Data, a destination | Muted outline, faint grey fill |
| `input` | A user, an origin | Soft outline, grey fill |
| `external` | Outside your system | Faint outline and fill |
| `optional` | Not in use, planned | Dashed outline on paper |

Typed forms choose kinds for you (a flowchart's start is an `input` pill, a
dependency's leaves are stores…); `focal: true` on an item makes it `focal`.

## Shapes

`pill` where people come in, `cylinder` where data ends up, `diamond` for a
decision, `circle` for a start, end or state marker, `rounded` for a state;
a rectangle otherwise. Typed forms pick shapes themselves.

## Arrows

| `kind` | Means | Looks |
| --- | --- | --- |
| `default` | A connection | Muted line, filled head |
| `accent` | The main path | Accent line and head |
| `dash` | Optional, a warning, a way back | Dashed soft line |

Labels are small mono capitals on a paper mask, so lines never cross the text.
Hovering a piece lights what it touches and runs the lit arrows in their
direction.

## Hues

Hues **group**: a zone and its boxes, a series of a chart, the sets of a Venn.
A box takes its zone's hue unless it has its own; with `colorEdges` a default
arrow takes the hue of the box it leaves. Rules of thumb:

- One hue per group, and few groups: three or four hues in a diagram is
  already a lot.
- Never a hue to say "important": that is the accent.
- Charts give each series the next hue in the list unless it names one;
  keep a series' hue the same across the diagrams of a page.

## The accent

The accent is editorial: the one or two things the reader should see first —
the outcome of a flowchart, the bar the page talks about, the main path. The
platform reports more than two (a run of joined accent arrows counts once).
If you want to accent four things, you haven't decided what the diagram is
about.

## The legend

Drawn under the diagram after a hairline, titled "LEYENDA", listing only what
the diagram uses. In a drawn diagram it names box kinds and arrow kinds with
default Spanish names ("Pieza central", "Servicio", "Datos / destino",
"Usuario / origen", "Externo", "Sin uso", "Conexión", "Camino principal",
"Opcional / aviso", "Conexión con una pieza lejana"); rename them for the
diagram with `kindNames`, `edgeNames` and `badgeName` when they mean something
more specific. Typed forms write their own legend (series, levels, marks); in
charts, hovering a series' entry lights its marks.

## Text measurement

The platform measures text without a browser, with average widths: a name
(12px sans) ≈ characters × 7px, a sub line (9px mono) ≈ characters × 5.6px, a
label (8px mono capitals) ≈ characters × 5.4px. A name or line that doesn't
fit its box is reported with its width ("\"Registro de contenedores\" (162px)
no cabe en 120px"). Shorten the text, move the detail to `sub` or `info`, or
widen the box — in that order.

## Size

A drawing is never shown wider than drawn and shrinks to the reading column;
one 640px or wider keeps its size on a phone and scrolls sideways. Design for
the column: 640–720px wide reads well; past ~900px everything shrinks.
