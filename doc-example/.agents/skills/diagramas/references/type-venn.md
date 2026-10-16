# Venn (`"type": "venn"`)

**Best for:** where two or three ideas meet and what lives in each meeting:
"desirable × feasible × viable", the qualities a good page needs at once,
shared ground between two disciplines. The reader looks at the overlaps.

**Not for:** four or more sets (use a `matrix` of things × properties), sets
of very different sizes whose size matters (the circles are always equal: use
a `bar` or `treemap`), a hierarchy (use `pyramid` or `tree`), or two lists
side by side with nothing shared (write two lists).

## The file

```json
{
  "type": "venn",
  "title": "Una buena página de la guía",
  "desc": "Lo que tiene que ser a la vez una página de esta guía",
  "sets": [
    { "id": "useful", "name": "Útil", "sub": "responde a su pregunta" },
    { "id": "faithful", "name": "Fiel", "sub": "dice lo que hace la plataforma" },
    { "id": "maintainable", "name": "Mantenible", "sub": "fácil de cambiar" }
  ],
  "regions": [
    { "sets": ["useful", "faithful"], "label": "Referencia" },
    { "sets": ["faithful", "maintainable"], "label": "Catálogo" },
    { "sets": ["useful", "maintainable"], "label": "Ejemplos" },
    { "sets": ["useful", "faithful", "maintainable"], "label": "Guía viva", "focal": true }
  ]
}
```

| Key | What it is |
| --- | --- |
| `sets` | Required. Two or three items (see [items.md](items.md)), each with a required `id`. Without `hue` they take `blue`, `violet` and `teal`, in order. |
| `regions` | Optional. The intersections: `{ "sets", "label", "focal" }`, `sets` being two or more set ids and `label` what is in that overlap; `focal: true` puts the label in the accent. |

## What the platform does

- Draws equal circles: two side by side, three in a triangle (two on top, one
  below). Each is filled with its hue at a very low opacity and outlined in
  it, so overlaps read darker where the tints compound.
- Writes each set's name in its hue outside its circle, on the side away from
  the others, with its `sub` lines under it.
- Writes each region's label inside its intersection: between the centres of
  its sets, pushed away from any set it leaves out, so a two-set region of a
  three-set Venn lands in that pair's overlap only.
- Region labels carry no link or hover card; the sets do (their `info` and
  `sub`).

## What you decide

- **Two or three sets, each one idea**, named with one word or two. The `sub`
  says what that idea means here.
- **Label the regions that mean something.** An empty intersection is fine;
  one with a label is a claim. The centre of a three-set Venn is usually the
  point of the diagram.
- **One focal region**, the overlap the page is about. Put the accent on the
  region, not on a set.
- Keep region labels short (one or two words): they sit inside a lens a few
  dozen pixels wide.

## Complexity budget

| Limit | Value |
| --- | --- |
| Sets | 2 to 3 |
| Accent elements | 2 (focal regions and focal sets) |

Over budget → a fourth set makes the overlaps unreadable; use a `matrix` (things
by properties) instead.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| No region labels | The reader sees overlaps but not what they hold |
| The accent on several regions | The overlap that matters disappears |
| Sets that are not comparable (a quality, a team, a tool) | The overlaps mean nothing |
| Long region labels | They spill out of their lens over the other circles |
| A Venn to say "these are different" | With nothing shared, it is two lists |

## Reported

A set without `id`, fewer than two sets ("Un Venn tiene 2 o 3 conjuntos"),
more than three, a region naming a set that doesn't exist ("`x` no es ninguno
de los conjuntos"; the region is left out), and more than two accents.

## Text version

A list of the set names, then a list of regions as "Útil ∩ Fiel: Referencia",
"Útil ∩ Fiel ∩ Mantenible: Guía viva".

## In this site

`diagramas/venn-good-page.json`, shown in `docs/diagrams/concepts.mdx`.
