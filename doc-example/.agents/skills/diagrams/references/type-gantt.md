# Gantt (`"type": "gantt"`)

**Best for:** plans and roadmaps: tasks with a start and an end, grouped into
phases, where the reader needs to see what overlaps, what runs in parallel
and where the milestones fall. The reader asks "what happens when, and what
runs at the same time?".

**Not for:** events that happen on a day with no duration (use `timeline`),
the order of steps and who does them (use `swimlane`), dependencies between
tasks (a `dependency` graph, or say it in `info`: a gantt draws no arrows), or
work in progress by state (use `kanban`).

## The file

```json
{
  "type": "gantt",
  "title": "Montar un repositorio de contenido",
  "desc": "Un plan de seis semanas para empezar un repositorio de contenido",
  "today": "2026-10-14",
  "phases": [
    {
      "name": "Preparar",
      "tasks": [
        { "name": "doc.config.yaml", "entity": "files/doc-config", "start": "2026-10-05", "end": "2026-10-06" },
        { "name": "El menú", "entity": "files/menu", "start": "2026-10-06", "end": "2026-10-09" }
      ]
    },
    {
      "name": "Publicar",
      "tasks": [
        { "name": "Primera sincronización", "milestone": "2026-11-02" },
        { "name": "Repaso de problemas", "start": "2026-11-02", "end": "2026-11-13" }
      ]
    }
  ]
}
```

| Key | What it is |
| --- | --- |
| `phases` | Required. The phases, top to bottom, each with `name` and its `tasks`. A task is an item (see [items.md](items.md); no `id` needed) with `start` and `end` (its last day, included), or `milestone` (one date) for a milestone. Dates are `AAAA-MM-DD`, or `AAAA-MM` for a whole month. |
| `today` | Optional. A date, drawn as a dashed line marked «HOY». |

## What the platform does

- Names sit in a **column on the left**, bars on a time axis to their right,
  one row per task in the order written, each phase framed with its name in
  capitals above its rows.
- The axis marks **each Monday** when the plan spans ten weeks or less, and
  **the first of each month** beyond, with a dashed rule down from each tick.
- A task is a bar from the start of its first day to the end of its last; a
  month `end` covers the whole month. A **milestone is a diamond**.
- The focal task's bar is in the accent tint, its name in the accent; a task
  with a `hue` is tinted with it; the rest are neutral.
- Hovering a bar shows its name, phase and dates. The legend shows «Tarea»,
  and «Tarea clave», «Hito», «Hoy» when used.

## What you decide

- **Phases are outcomes** («Preparar», «Publicar»), not dates; the axis says
  the dates.
- **One focal task**: the critical one, or the key deliverable. Bars all of
  the same weight say nothing.
- **Names fit the column** (about 180 px, two or three words); don't put the
  dates in the name, the bar and its card carry them.
- `today` only when the diagram is a status report that will be kept up to
  date; a forgotten «HOY» line ages badly.
- Plans longer than a few months at day precision are noise: use `AAAA-MM`
  dates, or a `timeline` of milestones.

## Complexity budget

| Limit | Value |
| --- | --- |
| Phases | 5 |
| Tasks | 16 (aim for 12) |
| Accent elements | 2 (focal tasks) |

Over budget → an overview gantt with one task per phase, and a detail gantt
per phase.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Dates in the task names | Duplicates the axis and overflows the column |
| Every task focal | Nothing stands out |
| Five parallel tasks in one phase | Overlap becomes unreadable; split the phase |
| Milestones written as one-day tasks | A diamond reads as a moment, a bar as work |
| Phases named by quarter | Describe scope; the calendar is on the axis |

## Reported

A date that doesn't exist (that task is left out), a task that ends before it
starts ("La tarea termina antes de empezar"; left out), a task with no dates
("Una tarea lleva start y end, o milestone si es un hito"; left out), a
milestone that also has `start` or `end` ("Un hito lleva milestone, sin start
ni end"), a name that doesn't fit its column, the budget and the accents. A
gantt with no valid task draws nothing.

## Text version

One entry per phase with its tasks under it: "Preparar" → "El menú: 6 oct
2026 – 9 oct 2026", "Primera sincronización: 2 nov 2026".

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/gantt-new-site.json`, in its `diagrams/time` page.
