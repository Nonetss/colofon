# Timeline (`"type": "timeline"`)

**Best for:** events on a real time axis: release history, project
milestones, an incident's chronology, the life of a page. The reader asks
"what happened when, and how far apart?".

**Not for:** tasks with a start and an end that overlap (use `gantt`), the
order of messages between actors (use `sequence`), states and what moves
between them (use `state`), or how something changes before and after (use
`architecture-delta`). A trend of values over time is a `line` chart.

## The file

```json
{
  "type": "timeline",
  "title": "La vida de una página",
  "desc": "Una página de esta guía desde su primer borrador hasta su última revisión",
  "events": [
    { "name": "Primer borrador", "date": "2026-09-01", "entity": "files/page" },
    { "name": "Ronda de preguntas", "date": "2026-09-08" },
    { "name": "Revisión", "date": "2026-09-22" },
    { "name": "Publicada", "date": "2026-10-01", "focal": true },
    { "name": "Revisada", "date": "2026-10-16", "entity": "header-fields/actualizado" }
  ],
  "spans": [
    { "name": "Preguntas abiertas", "start": "2026-09-08", "end": "2026-09-30", "hue": "violet" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `events` | Required. The events, each an item (see [items.md](items.md); no `id` needed) with `date`: `AAAA-MM-DD`, or `AAAA-MM` for a month. |
| `spans` | Optional. Periods as bands under the axis: `name`, `start`, `end` (dates) and an optional `hue`. |
| `scale` | Optional. `time` (default): each event at its date; `even`: evenly spaced, in date order, with no ticks. |

## What the platform does

- Events are **sorted by date** whatever order you write them in, and placed
  on one horizontal axis **honestly**: five times the time, five times the
  space. The axis spans the events and the spans, at least 720 px wide (96 px
  per event beyond that).
- Ticks under the axis (thinned to twelve at most) mark each Monday when the
  whole axis spans ten weeks or less, otherwise the first of each month
  («sep», January with its year).
- Each event is a dot; its **label alternates above and below**, with its date
  under the name («1 sep 2026»), climbing to an outer tier (three per side)
  where it would collide. A focal event's dot is bigger and in the accent, its
  name in bold accent.
- Spans are bands under the axis, stacked in rows when they overlap, tinted
  with their `hue` or neutral.
- The legend appears only with spans or a focal event: «Evento», «Hito
  principal».

## What you decide

- **`scale: "even"` only when the gaps don't matter** (an ordered list of
  versions); otherwise keep the honest scale, it is the point of a timeline.
- **Names are short** (two or three words): they share the width with their
  neighbours. Close events with long names collide.
- **One focal event**: the milestone the page is about.
- Use a span for a period that frames events («Preguntas abiertas»), not for a
  task; tasks with durations are a `gantt`.
- A dense cluster plus a few far-off events crushes the cluster: split into
  two timelines, or use `even`.

## Complexity budget

| Limit | Value |
| --- | --- |
| Events | 12 |
| Spans | 4 |
| Accent elements | 2 (focal events) |

Over budget → split by period (one timeline per phase or year).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| `even` for events whose spacing matters | It lies about time |
| Long sentences as event names | Labels collide and are dropped; detail goes in `info` |
| Every milestone focal | Nothing stands out |
| Spans as tasks with owners | That's a `gantt` |
| Dates as free text («a mediados de mayo») | Only `AAAA-MM-DD` or `AAAA-MM` place an event |

## Reported

A date that doesn't exist ("Es una fecha AAAA-MM-DD o AAAA-MM que exista",
e.g. `2026-02-30`; the event is left out), a span that ends before it starts
("Un periodo termina después de empezar"; left out), a label that can't be
placed without overlapping ("La etiqueta de "X" no cabe sin pisar otra:
separa los eventos o quita alguno"; the dot stays, unlabelled), the budget and
the accents.

## Text version

One line per event in date order: "1 sep 2026: Primer borrador".

## In this site

`diagrams/timeline-page-life.json`, shown in `docs/diagrams/time.mdx`.
