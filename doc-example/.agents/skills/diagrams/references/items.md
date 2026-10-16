# Pieces, values and dates of the typed forms

What every typed form (`"type": …`) shares: its common keys, the fields of its
pieces, how numbers and dates are written and shown, and the two limits the
platform checks on every diagram. Each `type-*.md` reference only adds what is
its own.

## The file's common keys

| Key | What it is |
| --- | --- |
| `type` | Required. The form: one of the 30 values in the routing table of `SKILL.md`. An unknown one is reported with the list, and nothing is drawn. |
| `title` | Required. Its title: the figure's caption and the first line of its text version. |
| `desc` | Required. What it shows, in one or two sentences: the text alternative screen readers and agents read. Missing → "desc: Falta: es obligatorio". |
| `variant` | Optional. One of the type's variants. Unknown → reported with the list, and the type's default drawing is used. On a type without variants: "Este tipo de diagrama no tiene variantes". |
| `$schema` | Optional. Ignored by the platform; lets the editor find the schema. |

Any other key is reported, naming the keys the type accepts: "`nodes` no es una
clave de un diagrama de flujo ($schema, type, title, desc, variant, steps,
links)".

## Pieces

Wherever a type's reference says *item* (a step, a state, a node, an actor, a
task, a card, an event, a component, a set, a level, a layer, a category…), it
accepts these fields besides its own:

| Field | What it is |
| --- | --- |
| `id` | Lowercase, digits and single hyphens, **unique across the whole diagram** (not just its list). Required wherever another part names the piece (links, `parent`, `from`/`to`…). |
| `name` | Required unless `entity` gives it. Short: it is measured, and a name that doesn't fit where it is drawn is reported. |
| `sub` | Optional. A line, or a list of lines, under the name. |
| `info` | Optional. What the reader's card says on hover. The place for the sentence the name can't hold. |
| `hue` | Optional. `rose`, `blue`, `cyan`, `violet`, `green`, `indigo`, `fuchsia`, `slate`, `teal` or `lime`. Groups, never decorates. |
| `focal` | Optional. `true`: drawn in the accent. Counts towards the two accents. |
| `entity` | Optional. `<type>/<id>` of a catalog entity: the piece takes its label as name (when it has none), links to its page, and the entity's page lists the diagram. |
| `page` | Optional. A page path of this site (`repository/menu`, without `.mdx`) the piece links to. Never together with `entity`. |

Reported on the piece's path (`steps.2.entity`): an entity or page that
doesn't exist (the piece stays, unlinked), a repeated id ("`a` ya es el id de
otra parte"), a missing id where one is needed ("Falta id: las demás partes lo
nombran por él"), a piece with neither `name` nor `entity`. A reference to an
id that doesn't exist is reported naming it ("`z` no es ninguna de las partes
del diagrama") and the part holding it (a link, a message…) is left out.

**Link pieces to the catalog.** In this site, a piece that stands for a file of
the contract is `"entity": "files/<id>"`, a component `"components/<id>"`, a
header field `"header-fields/<id>"`. Chart categories and data points are not
items and take no `entity`.

## Values

Wherever a type takes a number, it is a finite JSON number (`1200`, `-3.5`),
never a string. A type that takes values accepts:

| Key | What it is |
| --- | --- |
| `unit` | Optional. Text printed after each value: `"usuarios"`, `"€"`, `"%"`, `"s"`. |
| `decimals` | Optional. How many decimals are shown, 0 by default (values are rounded for display only). |

Values are always shown with Spanish separators, whatever the reader's
locale: `1234.5` with `unit: "€"` and `decimals: 1` → "1.234,5 €"; negatives
take a true minus sign ("−2.500"); percentages are whole ("−60 %").

## Dates

Wherever a type takes a date, it is `YYYY-MM-DD`, or `YYYY-MM` for a whole
month (read as its first day). Shown with Spanish short month names: "3 mar
2026", "mar 2026". A date that doesn't exist (`2026-02-30`, `2026-13-01`) is
reported on its field ("Es una fecha AAAA-MM-DD o AAAA-MM que exista") and its
part left out.

## The two limits on every diagram

- **The accent:** at most two things in the accent colour: each focal piece,
  and each main path (a run of accent arrows joined end to end counts once).
  More is reported: "Como mucho 2 elementos van en el color de acento y este
  diagrama tiene 3: deja solo lo que el lector debe ver primero".
- **The budget:** each type has limits (its reference's table). Each one
  passed is reported once — "Un Sankey lleva como mucho 8 nodos y este tiene
  10: pártelo en dos diagramas" — and the diagram is still drawn whole. Treat
  it as the signal to split, not as a number to tune.

## Text version

Every typed form has one, for screen readers and the page's `llm.txt`: a list
of connections, a nested list, numbered messages or a Markdown table of
values, depending on the type (each reference says which). Linked pieces stay
linked in it. That is why a structure belongs in a type, not in an
illustration.
