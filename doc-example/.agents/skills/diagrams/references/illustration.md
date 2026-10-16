# Illustration (`diagrams/<id>.svg`)

**Best for:** a figure no data describes: an exploded axonometric (the
layers of a stack as physical parts of one thing), a floor or site plan, a
device teardown. You draw it in SVG; the platform filters it through a
whitelist and paints it with the theme's colours, in light or dark.

**Not for:** anything made of pieces and connections. An illustration has
**no text version and no hover**: for a screen reader and for agents it is
only its `<title>` and `<desc>`. Pieces and arrows are a
[drawn diagram](drawn.md); ordered abstraction levels are `layers`;
containment is [nested](drawn-nested.md); where software runs is a
[deployment](drawn-deployment.md).

## The file

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300">
  <title>Dos capas, despiezadas</title>
  <desc>Una capa de páginas, destacada, flota sobre una capa de datos</desc>
  <line class="soft" x1="80" y1="112" x2="80" y2="222" stroke-width="1" stroke-dasharray="3 4"/>
  <g>
    <polygon class="muted" points="80,210 200,270 200,282 80,222"/>
    <polygon class="soft" points="200,270 320,210 320,222 200,282"/>
    <polygon class="paper" points="200,150 320,210 200,270 80,210"/>
    <polygon class="ink" points="200,150 320,210 200,270 80,210" fill="none" stroke-width="1.2"/>
  </g>
  <g>
    <polygon class="muted" points="80,100 200,160 200,172 80,112"/>
    <polygon class="soft" points="200,160 320,100 320,112 200,172"/>
    <polygon class="accent-soft" points="200,40 320,100 200,160 80,100"/>
    <polygon class="accent" points="200,40 320,100 200,160 80,100" fill="none" stroke-width="1.2"/>
    <line class="accent" x1="320" y1="100" x2="400" y2="100" stroke-width="1"/>
    <circle class="accent" cx="320" cy="100" r="3"/>
    <text class="ink" x="412" y="98" font-size="14" font-weight="600">docs/</text>
    <text class="muted" x="412" y="116" font-size="12">las páginas</text>
  </g>
</svg>
```

| Part | What it is |
| --- | --- |
| `viewBox` | Required on `<svg>`: four numbers. Its width and height are the drawing's size (640 or wider keeps 640 px on narrow screens). |
| `<title>` | Required, a direct child of `<svg>`: the title. |
| `<desc>` | Required, a direct child of `<svg>`: what it shows, the alt text and all agents get. Write it for someone who can't see it. |

Missing any of the three is reported (`Falta viewBox en <svg>: cuatro
números, como 0 0 800 600`, `Falta <title> en <svg>: …`, `Falta <desc> en
<svg>: …`) and a warning shows instead. A file that doesn't start with an
`<svg>` element: `No es un SVG que se pueda leer: …`. A `diagrams/<id>.json`
with the same id wins and the `.svg` is reported as unused. Show it like any
diagram: `<Diagram id="<id>" />`.

## The whitelist

- **Elements:** `svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `line`,
  `polyline`, `polygon`, `text`, `tspan`, `title`, `desc`. Text is kept only
  inside `text` and `tspan`.
- **Attributes:** each element's geometry (`x`, `y`, `width`, `height`,
  `rx`, `ry`, `cx`, `cy`, `r`, `x1`…`y2`, `points`, `d`; `dx`, `dy` on text),
  plus on any element `transform` (`translate`, `rotate`, `scale`, `skewX`,
  `skewY`, `matrix`), `opacity`, `fill-opacity`, `stroke-opacity` (0 to 1),
  `stroke-width`, `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`,
  and on text `text-anchor`, `font-size`, `font-weight` (a number, `normal`
  or `bold`). `fill` and `stroke` only as `none`. Values are checked: a
  number must be a number, a path only path commands.
- **Classes:** the roles and the ten hues below. Nothing else.

Everything else is removed, and each distinct thing is reported once with a
count; the rest is drawn:

```text
Se ha quitado <defs> 1 vez
Se ha quitado el atributo id 1 vez
Se ha quitado fill="#eb6c36" 2 veces: los colores van con las clases ink, muted, soft, paper, accent, accent-soft o un tono (rose, blue, …)
Se ha quitado la clase brand 1 vez
Se ha quitado el atributo font-family 1 vez
Se ha quitado el atributo style de <svg> 1 vez
```

So: no scripts, `<style>`, `style`, `id`, links, images, `use`, `defs`,
gradients, markers, filters, written colours or `font-family` (text uses the
reader's sans). The root's `xmlns`, `version`, `width` and `height` are
ignored silently.

## Colour by role

| Class | Colour |
| --- | --- |
| `ink` | The text and main lines |
| `muted` | Mid grey: secondary text, shaded faces |
| `soft` | Light grey: guides, the other shaded face |
| `paper` | The background: to hide what is behind |
| `accent` | The theme's accent: what the reader sees first |
| `accent-soft` | A light tint of the accent: the focal fill |
| `rose` … `lime` | The ten diagram hues |

- A class paints the shape's **fill**, unless it says `fill="none"`, and
  its **stroke only when it has `stroke-width`**, unless `stroke="none"`.
  A shape with no class is ink. A shape with no `stroke-width` has no
  outline at all.
- **Fill one colour, outline another: draw the shape twice**, first filled
  (`class="paper"`), then on top with `fill="none"` and `stroke-width`
  (`class="ink"`). One class can't do both.
- **A class on a `<g>` colours every shape inside it** that has no class of
  its own, so a part drawn in one colour is one group with one class; a
  shape's own class wins over its group's. `transform` and `opacity` on a
  group apply to all of it too.
- One accent thing, as everywhere: the focal part's top face in
  `accent-soft` with an `accent` outline, its leader and dot in `accent`.

## Drawing an axonometric

- **One projection for every point:** 2:1 dimetric,
  `X = ox + x − y`, `Y = oy + (x + y) / 2 − z` (x runs right-down, y
  left-down, z up). With model units in multiples of 4 every edge lands on
  whole pixels. Compute points; don't eyeball them.
- **Every part is a prism:** a top face (a rhombus for a rectangle) and the
  two visible side faces as polygons, each **shaded**: top `paper` (or
  `accent-soft` for the focal part), one side `muted`, the other `soft`,
  the same on every part, then the top's outline in `ink` with
  `fill="none"` and `stroke-width="1.2"`. Outline-only parts flip like a
  Necker cube.
- **Faces are opaque.** No `opacity` or `fill-opacity` on faces: what is
  behind would show through.
- **Paint order is depth:** the bottom part first; within a level, the
  parts farther back (smaller x + y) first. Trace lines (dashed `soft`
  verticals through the outer corners, `stroke-dasharray="3 4"`) go before
  every part so the parts cover them.
- **Explode along one axis**, straight up, with **one equal gap** between
  levels, at least half the height of the largest top face. Parts that sit
  side by side in the object share a level. A `transform="translate(0,-N)"`
  on a part's `<g>` is a clean way to lift it.
- **Labels in one column to the right**, horizontal: a 3 px dot on the
  part's right corner, a straight horizontal leader to the column, the name
  (`font-size="14" font-weight="600"`, `ink`) over a sub line
  (`font-size="12"`, `muted`). Leaders never bend or cross a part. No
  numbered callouts, no legend.
- **A plan** is one plate (a flat prism) with low walls cut at desk height
  so no wall hides a room, furniture and buildings as prisms to scale, roads
  and floor tints as flat `soft` polygons on the plate, painted back to
  front. Room tags are horizontal text on a `paper` rect backing, inside the
  room; one focal room gets an `accent-soft` floor.

## Budget

Nothing is checked but the whitelist; this is advice.

| Limit | Value |
| --- | --- |
| Parts (exploded) | 2 to 5 |
| Detail levels on a part | 3 (form, insets on the top face, micro detail) |
| Accent parts or rooms | 1 |
| Labels | one per part, in one column |

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| An illustration for pieces and connections | No text version: readers and agents lose it; draw it as JSON |
| A `<desc>` that is only a title | It is all a screen reader and an agent get |
| Written colours (`fill="#eb6c36"`) | Removed and reported; they wouldn't follow light and dark |
| Translucent faces | Parts behind show through |
| Outline-only parts | The figure flips between two readings |
| Parts exploding along two axes, or uneven gaps | The assembly order stops reading |
| Labels tilted onto a face, or numbered with a key | Labels stay horizontal, on the part they name |
| Gradients, shadows, glow | Removed, and not this look |

## In this site

`diagrams/repository-exploded.svg` (the three folders of a repository as
layers, `docs/` focal), shown in `docs/diagrams/illustrations.mdx`.
