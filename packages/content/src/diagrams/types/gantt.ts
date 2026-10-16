import { z } from "zod"
import { optional, salvagedList } from "#pages/diagram-read"
import type { References } from "#pages/diagram-schema"
import { checkBudget } from "#pages/diagram-types/budget"
import { formSchema, itemList } from "#pages/diagram-types/form"
import { type Item, itemFields } from "#pages/diagram-types/items"
import {
  checkFits,
  lineShape,
  maskedText,
  rectShape,
  shape,
  textShape,
  withDatum,
  withLink,
} from "#pages/diagram-types/layout/flow-draw"
import { exactScale, timeTicks } from "#pages/diagram-types/layout/scale"
import {
  emptyScene,
  type Graphic,
  type LegendEntry,
  type Scene,
  type TextTree,
  type Tools,
  type TypeModule,
} from "#pages/diagram-types/scene"
import {
  DAY,
  type DayOrMonth,
  dateSchema,
  dayTick,
  formatDate,
  monthTick,
  parseDate,
} from "#pages/diagram-types/values"

// Gantt chart (diagram-design's `type-gantt.md`): tasks with a start and an
// end, grouped into phases, as bars on a time axis that ticks weekly up to
// ten weeks and monthly beyond; a milestone is a diamond, `today` a dashed
// line. Names sit in a column on the left, the focal task in the accent.

const LIMITS = [
  { max: 5, what: "fases" },
  { max: 16, what: "tareas" },
]

const text = z.string().min(1)

function taskSchema(references: References) {
  return z.strictObject({
    ...itemFields(references),
    start: dateSchema.optional().meta({ description: "Cuándo empieza" }),
    end: dateSchema
      .optional()
      .meta({ description: "Cuándo termina (incluido)" }),
    milestone: dateSchema.optional().meta({
      description: "Un hito: su fecha, en lugar de start y end",
    }),
  })
}

function phaseSchema(references: References) {
  return z.strictObject({
    name: text.meta({ description: "El nombre de la fase" }),
    tasks: z.array(taskSchema(references)).min(1),
  })
}

/** A phase as read: its tasks are checked one by one, so one bad task never hides the others. */
const phases = z.strictObject({
  name: text,
  tasks: z.array(z.unknown()),
})

const tasks = taskSchema({})

function schema(references: References) {
  return formSchema("gantt", [], {
    phases: z.array(phaseSchema(references)).min(1).meta({
      description: "Las fases, cada una con sus tareas",
    }),
    today: dateSchema.optional().meta({
      description: "Hoy: una línea discontinua en esa fecha",
    }),
  })
}

const NAME_LEFT = 24
const NAME_WIDTH = 184
const CHART_LEFT = 232
const CHART_WIDTH = 720
const AXIS_Y = 40
const ROW = 32
const PHASE_ROW = 24

type Task = {
  item: Item
  /** Midnight UTC of its first day, and of the day after its last. */
  start: number
  end: number
  milestone: DayOrMonth | null
  startDate: DayOrMonth
  endDate: DayOrMonth
}

type Phase = { name: string; tasks: Task[] }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const read: Phase[] = []
  for (const { at, value } of salvagedList(
    phases,
    data.phases,
    "phases",
    ["name", "tasks"],
    tools.report
  )) {
    const kept: Task[] = []
    for (const { item, written } of itemList(
      tasks,
      value.tasks,
      `${at}.tasks`,
      tools
    )) {
      const task = taskOf(item, written, item.at, tools)
      if (task !== null) kept.push(task)
    }
    read.push({ name: value.name, tasks: kept })
  }
  const todayWritten = optional(dateSchema, data.today, "today", tools.report)
  const today = parseOptional(todayWritten)
  const all = read.flatMap((phase) => phase.tasks)
  checkBudget(
    "Un diagrama de Gantt",
    LIMITS,
    [read.length, all.length],
    tools.report
  )
  if (all.length === 0) return null

  const first = Math.min(...all.map((task) => task.start))
  const last = Math.max(...all.map((task) => task.end))
  // `last` is the midnight after the last day: the ticks stop before it.
  const { unit, ticks } = timeTicks(first, Math.max(first, last - 1))
  const domainStart = Math.min(first, ...ticks.slice(0, 1))
  const domainEnd = Math.max(last, nextTick(unit, ticks.at(-1), last))
  const x = exactScale(
    domainStart,
    domainEnd,
    CHART_LEFT,
    CHART_LEFT + CHART_WIDTH
  )

  const under: Graphic[] = []
  const over: Graphic[] = []
  ticks.forEach((tick, position) => {
    const at = x(tick)
    const label =
      unit === "week" ? dayTick(tick) : monthTick(tick, position === 0)
    under.push(textShape(at, AXIS_Y - 8, label, "tick", "start"))
  })
  under.push(
    lineShape(NAME_LEFT, AXIS_Y, CHART_LEFT + CHART_WIDTH, AXIS_Y, "line-rule")
  )

  let y = AXIS_Y + 8
  let mark = 0
  for (const phase of read) {
    const top = y
    y += PHASE_ROW
    for (const task of phase.tasks) {
      over.push(...taskShapes(task, phase.name, x, y, `m${mark}`))
      checkFits(
        task.item.name,
        "item",
        NAME_WIDTH - 8,
        task.item.at,
        tools.report
      )
      mark += 1
      y += ROW
    }
    under.push(
      rectShape(
        NAME_LEFT - 8,
        top,
        CHART_LEFT + CHART_WIDTH - NAME_LEFT + 16,
        y - top,
        6,
        "fill-none",
        "line-rule"
      ),
      textShape(
        NAME_LEFT,
        top + 16,
        phase.name.toUpperCase(),
        "legend",
        "start"
      )
    )
    y += 8
  }
  for (const tick of ticks)
    under.push(
      lineShape(x(tick), AXIS_Y, x(tick), y - 8, "line-rule", "line-dash")
    )
  if (today !== null) {
    const at = x(today.time)
    over.push(
      lineShape(at, AXIS_Y - 4, at, y - 8, "line-muted", "line-dash"),
      maskedText(at, AXIS_Y + 18, "HOY", "label", "middle", "text-muted")
    )
  }

  const scene = emptyScene({
    width: CHART_LEFT + CHART_WIDTH + 32,
    height: Math.ceil(y + 8),
  })
  scene.under = under
  scene.over = over
  scene.accents = all.filter((task) => task.item.focal).length
  scene.legend = legendOf(all, today !== null)
  scene.text = [{ kind: "tree", items: read.map(phaseText) }]
  return scene
}

function parseOptional(written: string | undefined): DayOrMonth | null {
  if (written === undefined) return null
  return parseDate(written)
}

/** The tick after the last one, so the axis ends on a tick. */
function nextTick(
  unit: "week" | "month",
  tick: number | undefined,
  last: number
): number {
  if (tick === undefined) return last
  if (unit === "week") return tick + 7 * DAY
  const at = new Date(tick)
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)
}

/** The midnight after the last day `date` covers: a day, or a whole month. */
function endOf(date: DayOrMonth): number {
  if (date.precision === "day") return date.time + DAY
  const at = new Date(date.time)
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)
}

function taskOf(
  item: Item,
  written: { start?: string; end?: string; milestone?: string },
  at: string,
  tools: Tools
): Task | null {
  if (written.milestone !== undefined) {
    const milestone = parseDate(written.milestone)
    if (written.start !== undefined || written.end !== undefined)
      tools.report(at, "Un hito lleva milestone, sin start ni end")
    if (milestone === null) return null
    return {
      item,
      start: milestone.time,
      end: milestone.time,
      milestone,
      startDate: milestone,
      endDate: milestone,
    }
  }
  if (written.start === undefined || written.end === undefined) {
    tools.report(at, "Una tarea lleva start y end, o milestone si es un hito")
    return null
  }
  const start = parseDate(written.start)
  const end = parseDate(written.end)
  if (start === null || end === null) return null
  if (end.time < start.time) {
    tools.report(`${at}.end`, "La tarea termina antes de empezar")
    return null
  }
  return {
    item,
    start: start.time,
    end: endOf(end),
    milestone: null,
    startDate: start,
    endDate: end,
  }
}

function taskShapes(
  task: Task,
  phase: string,
  x: (time: number) => number,
  y: number,
  id: string
): Graphic[] {
  const focal = task.item.focal
  const nameClass = focal ? "text-accent" : "text-ink"
  const name = withLink(
    textShape(
      NAME_LEFT,
      y + ROW / 2 + 4,
      task.item.name,
      "item",
      "start",
      nameClass
    ),
    task.item.link
  )
  const datum = {
    id,
    label: task.item.name,
    series: phase,
    value: rangeText(task),
    info: task.item.info,
  }
  const cy = y + ROW / 2
  if (task.milestone !== null) {
    const cx = x(task.start)
    const fill = focal ? "fill-accent" : "fill-ink"
    const diamond = shape(
      {
        kind: "polygon",
        points: [
          [cx, cy - 7],
          [cx + 7, cy],
          [cx, cy + 7],
          [cx - 7, cy],
        ],
      },
      fill
    )
    return [name, withDatum(diamond, datum)]
  }
  const left = x(task.start)
  const width = Math.max(4, x(task.end) - left)
  const bar = barOf(left, y + 6, width, task)
  return [name, withDatum(bar, datum)]
}

function barOf(left: number, top: number, width: number, task: Task): Graphic {
  if (task.item.focal)
    return rectShape(
      left,
      top,
      width,
      ROW - 12,
      4,
      "fill-accent-tint",
      "line-accent"
    )
  if (task.item.hue !== null)
    return {
      ...rectShape(left, top, width, ROW - 12, 4, "fill-hue-tint", "line-hue"),
      hue: task.item.hue,
    }
  return rectShape(left, top, width, ROW - 12, 4, "fill-soft", "line-muted")
}

function rangeText(task: Task): string {
  if (task.milestone !== null) return formatDate(task.milestone)
  const start = formatDate(task.startDate)
  const end = formatDate(task.endDate)
  if (start === end) return start
  return `${start} – ${end}`
}

function phaseText(phase: Phase): TextTree {
  return {
    line: [phase.name],
    children: phase.tasks.map((task) => ({
      line: [`${task.item.name}: ${rangeText(task)}`],
      children: [],
    })),
  }
}

function legendOf(tasks: readonly Task[], today: boolean): LegendEntry[] {
  const entries: LegendEntry[] = [
    {
      name: "Tarea",
      sample: {
        kind: "swatch",
        classes: ["fill-soft", "line-muted"],
        hue: null,
      },
      series: null,
    },
  ]
  if (tasks.some((task) => task.item.focal && task.milestone === null))
    entries.push({
      name: "Tarea clave",
      sample: {
        kind: "swatch",
        classes: ["fill-accent-tint", "line-accent"],
        hue: null,
      },
      series: null,
    })
  if (tasks.some((task) => task.milestone !== null))
    entries.push({
      name: "Hito",
      sample: { kind: "dot", classes: ["fill-ink"], hue: null },
      series: null,
    })
  if (today)
    entries.push({
      name: "Hoy",
      sample: { kind: "line", classes: ["line-muted", "line-dash"], hue: null },
      series: null,
    })
  return entries
}

export const gantt: TypeModule = {
  name: "gantt",
  label: "Un diagrama de Gantt",
  keys: ["phases", "today"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
