import { z } from "zod"
import { fit } from "#diagrams/measure"
import {
  accentPaths,
  type DiagramBox,
  type DiagramEdge,
  type LegendEntry,
  type Point,
  type TextPart,
} from "#diagrams/model"
import { salvagedList } from "#diagrams/report"
import type { References } from "#diagrams/schema"
import { checkBudget } from "#diagrams/types/kit/budget"
import {
  arrowEdge,
  lineShape,
  rectShape,
  roleWidth,
  textShape,
} from "#diagrams/types/kit/flow"
import { formSchema, itemList } from "#diagrams/types/kit/form"
import { type Item, itemBox, itemFields } from "#diagrams/types/kit/items"
import {
  emptyScene,
  type Scene,
  type Tools,
  type TypeModule,
} from "#diagrams/types/kit/scene"

// Sequence diagram (diagram-design's `type-sequence.md`): actors as headed
// lifelines left to right, messages as arrows between them from top to
// bottom in order, a self-call as a short loop, and combined fragments
// (`alt`, `opt`, `loop`, `par`) as framed regions with their kind in a tab,
// nested one level at most. Each message is an arrow between the actors'
// boxes, so hovering an actor lights every message it sends or receives.

const MESSAGE_KINDS = ["call", "return", "async", "accent"] as const
const FRAGMENT_KINDS = ["alt", "opt", "loop", "par"] as const

type MessageKind = (typeof MESSAGE_KINDS)[number]

const LIMITS = [
  { max: 6, what: "actores" },
  { max: 14, what: "mensajes" },
  { max: 3, what: "fragmentos" },
]

const text = z.string().min(1)

function actorSchema(references: References) {
  return z.strictObject(itemFields(references))
}

const messageSchema = z.strictObject({
  from: z.string().meta({ description: "El id del actor que lo envía" }),
  to: z.string().meta({ description: "El id del actor que lo recibe" }),
  label: text.meta({ description: "Lo que dice el mensaje" }),
  kind: z.enum(MESSAGE_KINDS).optional().meta({
    description:
      "call (por defecto): llamada; return: respuesta, a trazos; async: sin esperar respuesta; accent: el camino principal",
  }),
  info: text.optional().meta({
    description: "Lo que dice la tarjeta al pasar por encima",
  }),
})

const index = z.number().int().min(0)

const fragmentSchema = z.strictObject({
  kind: z.enum(FRAGMENT_KINDS).meta({
    description:
      "alt: alternativas; opt: opcional; loop: repetición; par: a la vez",
  }),
  label: text.optional().meta({ description: "Su condición, en el marco" }),
  first: index.meta({
    description: "El primer mensaje que enmarca (0 el primero)",
  }),
  last: index.meta({ description: "El último mensaje que enmarca" }),
  else: index.optional().meta({
    description: "En un alt, el mensaje con el que empieza la otra rama",
  }),
})

type Message = z.infer<typeof messageSchema>
type Fragment = z.infer<typeof fragmentSchema>

const actors = actorSchema({})

function schema(references: References) {
  return formSchema("sequence", [], {
    actors: z.array(actorSchema(references)).min(1).meta({
      description: "Los actores, de izquierda a derecha, cada uno con id",
    }),
    messages: z.array(messageSchema).min(1).meta({
      description: "Los mensajes, de arriba abajo",
    }),
    fragments: z.array(fragmentSchema).optional().meta({
      description: "Los marcos alt, opt, loop o par sobre varios mensajes",
    }),
  })
}

const TOP = 24
const HEAD = 44
/** The vertical step between two messages, and a self-call's. */
const STEP = 36
const SELF_STEP = 48
/** What a fragment's tab takes above its first message, and its bottom margin. */
const FRAME_TOP = 36
const FRAME_BOTTOM = 14
const ELSE_GAP = 24

/** A read fragment, with the depth it nests at. */
type Frame = { at: string; fragment: Fragment; depth: number }

function read(data: Record<string, unknown>, tools: Tools): Scene | null {
  const actorList = itemList(actors, data.actors, "actors", tools, {
    needsId: true,
  })
  const items = actorList
    .map(({ item }) => item)
    .filter((item) => item.id !== null)
  const ids = new Set(items.map((item) => item.id ?? ""))
  const messages: { at: string; message: Message }[] = []
  for (const { at, value } of salvagedList(
    messageSchema,
    data.messages,
    "messages",
    ["from", "to", "label"],
    tools.report
  )) {
    let known = true
    for (const end of ["from", "to"] as const) {
      if (ids.has(value[end])) continue
      tools.report(
        `${at}.${end}`,
        `\`${value[end]}\` no es ninguno de los actores`
      )
      known = false
    }
    if (known) messages.push({ at, message: value })
  }
  const frames = framesOf(
    salvagedList(
      fragmentSchema,
      data.fragments,
      "fragments",
      ["kind", "first", "last"],
      tools.report,
      false
    ),
    messages.length,
    tools
  )
  checkBudget(
    "Un diagrama de secuencia",
    LIMITS,
    [items.length, messages.length, frames.length],
    tools.report
  )

  // Actors left to right, each gap wide enough for the labels across it.
  const widths = items.map((item) => fit(item.name, item.sub, null, 120))
  const centres: number[] = []
  let x = 32 + (widths[0] ?? 120) / 2
  items.forEach((item, position) => {
    if (position > 0) {
      const before = items[position - 1]
      const gap = Math.max(
        ((widths[position - 1] ?? 0) + (widths[position] ?? 0)) / 2 + 40,
        widestBetween(messages, before, item) + 48
      )
      x += gap
    }
    centres.push(x)
  })
  const centreOf = new Map<string, number>()
  items.forEach((item, position) => {
    centreOf.set(item.id ?? "", centres[position] ?? 0)
  })

  // Messages top to bottom, leaving room for the fragments' tabs.
  const ys: number[] = []
  let y = TOP + HEAD + 32
  messages.forEach(({ message }, position) => {
    y += FRAME_TOP * framesStartingAt(frames, position)
    if (frames.some((frame) => frame.fragment.else === position)) y += ELSE_GAP
    ys.push(y)
    y += message.from === message.to ? SELF_STEP : STEP
    y += FRAME_BOTTOM * framesEndingAt(frames, position)
  })
  const bottom = y

  const scene = emptyScene({ width: 0, height: 0 })
  const boxes = new Map<string, DiagramBox>()
  items.forEach((item, position) => {
    const w = widths[position] ?? 120
    const centre = centres[position] ?? 0
    const box = itemBox(item, { x: centre - w / 2, y: TOP, w, h: HEAD })
    boxes.set(item.id ?? "", box)
    scene.nodes.push(box)
    scene.under.push(
      lineShape(centre, TOP + HEAD, centre, bottom, "line-rule", "line-dash")
    )
  })

  const right = Math.max(
    ...centres.map((centre, position) => centre + (widths[position] ?? 0) / 2)
  )
  for (const frame of frames)
    scene.under.push(...frameShapes(frame, messages, ys, centreOf, right))

  const edges: DiagramEdge[] = []
  messages.forEach(({ message }, position) => {
    const at = ys[position] ?? 0
    const from = centreOf.get(message.from) ?? 0
    const to = centreOf.get(message.to) ?? 0
    edges.push(messageEdge(position, message, from, to, at))
  })
  scene.edges = edges
  scene.size = {
    width: Math.ceil(
      Math.max(right, ...selfLoopRights(messages, centreOf)) + 32
    ),
    height: Math.ceil(bottom + 8),
  }
  scene.accents =
    items.filter((item) => item.focal).length +
    accentPaths(edges.filter((edge) => edge.kind === "accent"))
  scene.legend = legendOf(messages.map(({ message }) => message))
  scene.text = [
    { kind: "list", ordered: false, items: textLines(messages, frames) },
  ]
  return scene
}

/** The widest label of a message between two neighbouring actors. */
function widestBetween(
  messages: readonly { message: Message }[],
  a: Item | undefined,
  b: Item
): number {
  let widest = 0
  for (const { message } of messages) {
    const ends = [message.from, message.to]
    if (
      a === undefined ||
      !ends.includes(a.id ?? "") ||
      !ends.includes(b.id ?? "")
    )
      continue
    widest = Math.max(widest, roleWidth(message.label, "label"))
  }
  return widest
}

function selfLoopRights(
  messages: readonly { message: Message }[],
  centres: ReadonlyMap<string, number>
): number[] {
  return messages
    .filter(({ message }) => message.from === message.to)
    .map(
      ({ message }) =>
        (centres.get(message.from) ?? 0) +
        36 +
        roleWidth(message.label, "label")
    )
}

/**
 * The fragments that point at real messages and nest one level at most;
 * a fragment out of range, overlapping another or nested deeper is
 * reported and left out.
 */
function framesOf(
  written: readonly { at: string; value: Fragment }[],
  count: number,
  tools: Tools
): Frame[] {
  const kept: Frame[] = []
  for (const { at, value } of written) {
    if (value.first > value.last || value.last >= count) {
      tools.report(
        at,
        `Un fragmento va de un mensaje a otro posterior que exista (hay ${count} mensajes, del 0 al ${count - 1})`
      )
      continue
    }
    if (
      value.else !== undefined &&
      (value.else <= value.first || value.else > value.last)
    ) {
      tools.report(
        `${at}.else`,
        "else es un mensaje dentro del fragmento, después del primero"
      )
      continue
    }
    const overlapping = kept.find(
      ({ fragment }) =>
        value.first <= fragment.last &&
        fragment.first <= value.last &&
        !contains(fragment, value) &&
        !contains(value, fragment)
    )
    if (overlapping !== undefined) {
      tools.report(
        at,
        `Se solapa con el fragmento de ${overlapping.at}: uno va dentro del otro o separados`
      )
      continue
    }
    const outer = kept.filter(
      ({ fragment }) => contains(fragment, value) || contains(value, fragment)
    )
    if (outer.some(({ depth }) => depth > 0) || outer.length > 1) {
      tools.report(at, "Los fragmentos se anidan un nivel como mucho")
      continue
    }
    const inside = outer.some(({ fragment }) => contains(fragment, value))
    const depth = inside ? 1 : 0
    kept.push({ at, fragment: value, depth })
    for (const frame of outer)
      if (contains(value, frame.fragment)) frame.depth = 1
  }
  return kept
}

function contains(outer: Fragment, inner: Fragment): boolean {
  return outer.first <= inner.first && inner.last <= outer.last
}

function framesStartingAt(frames: readonly Frame[], position: number): number {
  return frames.filter(({ fragment }) => fragment.first === position).length
}

function framesEndingAt(frames: readonly Frame[], position: number): number {
  return frames.filter(({ fragment }) => fragment.last === position).length
}

/** A fragment's frame, its kind's tab, its condition and its else line. */
function frameShapes(
  frame: Frame,
  messages: readonly { message: Message }[],
  ys: readonly number[],
  centres: ReadonlyMap<string, number>,
  right: number
) {
  const { fragment, depth } = frame
  const xs: number[] = []
  for (let position = fragment.first; position <= fragment.last; position++) {
    const message = messages[position]?.message
    if (message === undefined) continue
    xs.push(centres.get(message.from) ?? 0, centres.get(message.to) ?? 0)
    if (message.from === message.to)
      xs.push(
        (centres.get(message.from) ?? 0) +
          36 +
          roleWidth(message.label, "label")
      )
  }
  const pad = 28 - 8 * depth
  const left = Math.max(8, Math.min(...xs) - pad)
  const frameRight = Math.min(right + 24, Math.max(...xs) + pad)
  const top = (ys[fragment.first] ?? 0) - FRAME_TOP + 4 + 2 * depth
  const lastY = ys[fragment.last] ?? 0
  const lastStep = selfStep(messages[fragment.last]?.message)
  const bottom = lastY + lastStep - 14 - 2 * depth
  const kind = fragment.kind.toUpperCase()
  const tab = roleWidth(kind, "label") + 14
  const shapes = [
    rectShape(
      left,
      top,
      frameRight - left,
      bottom - top,
      4,
      "fill-none",
      "line-soft"
    ),
    rectShape(left, top, tab, 14, 2, "fill-paper", "line-soft"),
    textShape(left + tab / 2, top + 10, kind, "label", "middle", "text-muted"),
  ]
  if (fragment.label !== undefined)
    shapes.push(
      textShape(
        left + tab + 8,
        top + 10,
        `[${fragment.label}]`,
        "label",
        "start",
        "text-muted"
      )
    )
  if (fragment.else !== undefined) {
    const at = (ys[fragment.else] ?? 0) - ELSE_GAP + 2
    shapes.push(
      lineShape(left, at, frameRight, at, "line-soft", "line-dash"),
      textShape(left + 8, at + 12, "[ELSE]", "label", "start", "text-muted")
    )
  }
  return shapes
}

function selfStep(message: Message | undefined): number {
  if (message !== undefined && message.from === message.to) return SELF_STEP
  return STEP
}

/** A message as an arrow at height `y`: straight across, or a loop for a self-call. */
function messageEdge(
  position: number,
  message: Message,
  from: number,
  to: number,
  y: number
): DiagramEdge {
  const kind = message.kind ?? "call"
  const base = {
    index: position,
    from: message.from,
    to: message.to,
    kind: edgeKind(kind),
    label: message.label,
    info: message.info ?? null,
    head: headOf(kind),
  }
  if (message.from === message.to) {
    const points: Point[] = [
      [from, y],
      [from + 28, y],
      [from + 28, y + 18],
      [from + 2, y + 18],
    ]
    return arrowEdge({
      ...base,
      points,
      at: [from + 36, y + 12],
      anchor: "start",
    })
  }
  const towards = Math.sign(to - from)
  return arrowEdge({
    ...base,
    points: [
      [from, y],
      [to - towards, y],
    ],
    at: [(from + to) / 2, y - 6],
    anchor: "middle",
  })
}

function edgeKind(kind: MessageKind): DiagramEdge["kind"] {
  if (kind === "return") return "dash"
  if (kind === "accent") return "accent"
  return "default"
}

function headOf(kind: MessageKind): DiagramEdge["head"] {
  if (kind === "async") return "triangle"
  return "arrow"
}

/** "1. <from> → <to>: <label>", each fragment's kind and label before its first message. */
function textLines(
  messages: readonly { message: Message }[],
  frames: readonly Frame[]
): TextPart[][] {
  const lines: TextPart[][] = []
  messages.forEach(({ message }, position) => {
    for (const { fragment } of frames) {
      if (fragment.first === position) lines.push([fragmentLine(fragment)])
      if (fragment.else === position) lines.push(["[else]"])
    }
    lines.push([
      `${position + 1}. `,
      { box: message.from },
      " → ",
      { box: message.to },
      `: ${message.label}`,
    ])
  })
  return lines
}

function fragmentLine(fragment: Fragment): string {
  if (fragment.label === undefined) return `[${fragment.kind}]`
  return `[${fragment.kind}: ${fragment.label}]`
}

function legendOf(messages: readonly Message[]): LegendEntry[] {
  const kinds = new Set(messages.map((message) => message.kind ?? "call"))
  const entries: LegendEntry[] = []
  if (kinds.has("call"))
    entries.push({
      name: "Llamada",
      sample: { kind: "edge", edge: "default" },
      series: null,
    })
  if (kinds.has("return"))
    entries.push({
      name: "Respuesta",
      sample: { kind: "edge", edge: "dash" },
      series: null,
    })
  if (kinds.has("async"))
    entries.push({
      name: "Sin esperar respuesta",
      sample: { kind: "edge", edge: "default", head: "triangle" },
      series: null,
    })
  if (kinds.has("accent"))
    entries.push({
      name: "Camino principal",
      sample: { kind: "edge", edge: "accent" },
      series: null,
    })
  return entries
}

export const sequence: TypeModule = {
  name: "sequence",
  label: "Un diagrama de secuencia",
  keys: ["actors", "messages", "fragments"],
  variants: [],
  schema,
  read: (data, tools) => read(data, tools),
}
