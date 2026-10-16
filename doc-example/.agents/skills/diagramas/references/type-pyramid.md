# Pyramid and funnel (`"type": "pyramid"`, `"variant": "funnel"`)

**Best for:** a ranked hierarchy where the broad bottom holds up the narrow
top: a hierarchy of needs, what a reader needs before the answer, value
tiers. With `"variant": "funnel"`, a drop-off: how many start, how many get
through each step, where most are lost.

**Not for:** a hierarchy with branches (use `tree`), levels where each one
uses the one below as a technical layer (use `layers`), quantities that don't
narrow in order (use `bar`), or a flow that splits and merges (use `sankey`).

## The file

```json
{
  "type": "pyramid",
  "title": "Lo que necesita quien lee",
  "desc": "De lo que sostiene la guía a lo que el lector viene a buscar",
  "levels": [
    { "name": "Su respuesta", "sub": "en una página", "focal": true },
    { "name": "Ejemplos que copiar" },
    { "name": "Reglas y claves", "page": "pages/header" },
    { "name": "Contrato validado", "page": "repository" }
  ]
}
```

```json
{
  "type": "pyramid",
  "variant": "funnel",
  "title": "De la visita a la primera página",
  "desc": "De cuántos visitan la guía a cuántos publican su primera página",
  "unit": "personas",
  "levels": [
    { "name": "Visitan la guía", "value": 1200 },
    { "name": "Leen Primeros pasos", "value": 640 },
    { "name": "Crean su repositorio", "value": 180, "focal": true },
    { "name": "Publican una página", "value": 120 }
  ]
}
```

| Key | What it is |
| --- | --- |
| `levels` | Required. The levels, **top to bottom**, each an item (see [items.md](items.md)) plus an optional `value`, a number above 0. |
| `variant` | Optional. `funnel`: narrows downwards. |
| `unit`, `decimals` | Optional. The text after each value (`"personas"`, `"€"`) and how many decimals are shown (0 by default, up to 6). |

## What the platform does

- Stacks the levels as trapezoids with paper seams between them: a pyramid
  narrows evenly from its base to an apex 30 % as wide; a funnel the other
  way round.
- A **funnel whose levels all have `value`** draws each level as wide as its
  value (never narrower than the apex) and writes the change from the level
  above beside it, rounded to whole percent: 1200 → 640 is "−47 %".
- Values are printed under the name (with `unit`) in either variant; in a
  pyramid they don't change the widths.
- Fills: the accent tint for `focal`, the hue's tint for `hue`, a soft grey
  otherwise. Name and `sub` lines are centred in the level.

## What you decide

- **Pyramid or funnel, not both.** A pyramid's top is the rarest or most
  valuable; a funnel's bottom is the smallest group, the conversion.
- **Write the levels from the top**, even in a pyramid where the reader reads
  from the base: the first level is the apex.
- **In a funnel, give every level a value or none.** With values the widths
  are honest; without, it is a picture of narrowing and says so.
- **One focal level**: the apex of a pyramid, the conversion or the biggest
  drop of a funnel. Not the base.
- **Short names.** The narrow end leaves about 140px for a name; the platform
  reports one that doesn't fit its level.

## Complexity budget

| Limit | Value |
| --- | --- |
| Levels | 6 |
| Accent elements | 2 (focal levels) |

Over budget → merge adjacent levels, or split the stack into an overview and
a detail of one band.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Levels in bottom-to-top order | The base ends up on top; the platform reads them top-down |
| A funnel with values on some levels only | Reported, and drawn without values: the widths stop meaning anything |
| A pyramid for data that isn't ranked | Use a `tree` or a `bar` |
| The accent on the base | It dilutes the "the top is rare" signal |
| Made-up funnel numbers presented as real | Say they are illustrative in `desc` or the page, as this site does |
| Seven or more levels | They become slivers the names don't fit in |

## Reported

A level that is not an item, a `value` that is not above 0, a funnel where
only some levels have a value ("Un embudo con valores los lleva en todos sus
niveles: así su ancho dice algo"), a name too wide for its level (`"…" (180px)
no cabe en 140px: acórtalo`), more than 6 levels and more than two accents.

## Text version

A numbered list of the levels, top to bottom, with each value and drop:
"Leen Primeros pasos: 640 personas (−47 %)".

## In this site

`diagramas/pyramid-reader-needs.json` (pyramid) and
`diagramas/pyramid-funnel-first-page.json` (funnel), both shown in
`docs/diagrams/concepts.mdx`.
