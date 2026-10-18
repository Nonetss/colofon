import { z } from "zod"
import { entityPagePath } from "#contract/catalog/paths"
import type { Catalog, Entity } from "#contract/catalog/read"
import type { DiagramBox } from "#diagrams/model"
import { type Report, subLines } from "#diagrams/report"
import {
  entityRef,
  HUES,
  type Hue,
  idSchema,
  type NodeKind,
  pageRef,
  type References,
} from "#diagrams/schema"
import type { Tools } from "#diagrams/types/kit/scene"

// The items of the typed forms (a step, a state, an actor, a task, a card…):
// named, described, tinted and linked exactly as a drawn diagram's box is,
// with ids unique across the diagram and every reference to one checked.

const text = z.string().min(1)

/** The fields every typed item accepts, besides its form's own. */
export function itemFields(references: References) {
  return {
    id: idSchema.optional().meta({
      description: "Lo que nombran las demás partes del diagrama",
    }),
    name: text.optional().meta({
      description: "Su nombre; con entity, por defecto el suyo",
    }),
    sub: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .meta({ description: "Una línea, o varias, bajo el nombre" }),
    info: text.optional().meta({
      description: "Lo que dice la tarjeta al pasar por encima",
    }),
    hue: z.enum(HUES).optional().meta({ description: "Su color" }),
    focal: z.boolean().optional().meta({
      description: "true: va en el color de acento (dos como mucho)",
    }),
    entity: entityRef(references.entityKeys).optional().meta({
      description:
        "La entidad del catálogo que es (<tipo>/<id>): enlaza a su ficha",
    }),
    page: pageRef(references.pagePaths).optional().meta({
      description: "La página del repositorio a la que enlaza",
    }),
  }
}

const unchecked = z.strictObject(itemFields({}))

/** What an item's fields hold, as written. */
export type ItemWritten = z.infer<typeof unchecked>

/** An item checked against the catalog, the pages and the other items. */
export type Item = {
  at: string
  id: string | null
  name: string
  sub: string[]
  info: string | null
  hue: Hue | null
  focal: boolean
  entity: Entity | null
  /** The page path it links to: its entity's page, or its `page`. */
  link: string | null
}

/**
 * Reads the item written at `at`: its id (repeated ids are reported and
 * dropped, a missing one too when `needsId`), its name (its entity's label
 * without one) and its link.
 */
export function readItem(
  written: ItemWritten,
  at: string,
  tools: Tools,
  needsId: boolean
): Item {
  let id = written.id ?? null
  if (id !== null && tools.ids.has(id)) {
    tools.report(`${at}.id`, `\`${id}\` ya es el id de otra parte`)
    id = null
  }
  if (id !== null) tools.ids.add(id)
  if (id === null && needsId && written.id === undefined)
    tools.report(at, "Falta id: las demás partes lo nombran por él")
  const entity = entityOf(
    written.entity,
    tools.context.catalog,
    `${at}.entity`,
    tools.report
  )
  if (entity !== null) tools.entities.push(entity)
  return {
    at,
    id,
    name: itemName(written.name, entity, id, at, tools.report),
    sub: subLines(written.sub),
    info: written.info ?? null,
    hue: written.hue ?? null,
    focal: written.focal === true,
    entity,
    link: linkOf(written, entity, tools.context.pages, at, tools.report),
  }
}

function itemName(
  written: string | undefined,
  entity: Entity | null,
  id: string | null,
  at: string,
  report: Report
): string {
  if (written !== undefined) return written
  if (entity !== null) return entity.label
  if (id === null) {
    report(at, "Lleva `name` o `entity`")
    return ""
  }
  return id
}

/** Where a box is drawn and how. */
export type BoxPlace = {
  x: number
  y: number
  w: number
  h: number
  shape?: DiagramBox["shape"]
  kind?: NodeKind
  tag?: string | null
  zone?: string | null
}

/**
 * The item as a box at `place`: a focal item is a `focal` box, any other one
 * a box of `place.kind` (`service` by default).
 */
export function itemBox(item: Item, place: BoxPlace): DiagramBox {
  return {
    id: item.id,
    x: place.x,
    y: place.y,
    w: place.w,
    h: place.h,
    kind: boxKind(item, place.kind),
    tag: place.tag ?? null,
    name: item.name,
    sub: item.sub,
    shape: place.shape ?? null,
    hue: item.hue,
    zone: place.zone ?? null,
    info: item.info,
    trace: false,
    needs: [],
    entity: item.entity,
    link: item.link,
    rows: null,
    ops: null,
    more: null,
  }
}

function boxKind(item: Item, kind: NodeKind | undefined): NodeKind {
  if (item.focal) return "focal"
  if (kind !== undefined) return kind
  return "service"
}

// ── Links ───────────────────────────────────────────────────────────────

/** The entity `<type>/<id>` names, reported at `at` when it is none. */
export function entityOf(
  written: string | undefined,
  catalog: Catalog,
  at: string,
  report: Report
): Entity | null {
  if (written === undefined) return null
  const [typeId = "", entityId = ""] = written.split("/")
  const entity = catalog.get(typeId)?.entities.get(entityId)
  if (entity === undefined) {
    report(at, `\`${written}\` no es ninguna entidad del catálogo`)
    return null
  }
  return entity
}

/** The page a box or item links to: its entity's, or its `page`. */
export function linkOf(
  written: { entity?: string; page?: string },
  entity: Entity | null,
  pages: ReadonlySet<string>,
  at: string,
  report: Report
): string | null {
  if (written.entity !== undefined && written.page !== undefined)
    report(at, "Lleva `entity` o `page`, no los dos")
  if (entity !== null) return entityPagePath(entity)
  if (written.entity !== undefined || written.page === undefined) return null
  if (!pages.has(written.page)) {
    report(`${at}.page`, `\`${written.page}\` no es ninguna página de docs/`)
    return null
  }
  return written.page
}
