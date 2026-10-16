import type { Element, ElementContent } from "hast"
import type { MdxJsxFlowElement } from "mdast-util-mdx"
import {
  type Catalog,
  type CatalogType,
  type Entity,
  labelField,
} from "#contract/catalog"
import { entityPagePath } from "#contract/catalog-paths"
import {
  type FieldDefinition,
  ID_COLUMN,
  type TypeDefinition,
} from "#contract/meta-schema"

// `<Entities type="…" columns="…" group="…" />`: a table of the valid
// entities of one catalog type, built as hast so cells can hold links and
// joined lists. Problems come back as messages; the caller adds the line.

/** The component pages write to show a catalog type. */
export const ENTITIES = "Entities"

export type EntitiesContext = {
  catalog: Catalog
  /** The reader route of a page path. */
  routeOf: (pagePath: string) => string
  /** The title of a page path. */
  titleOf: (pagePath: string) => string
}

type Options = {
  type: string | null
  columns: string | null
  group: string | null
}

const collator = new Intl.Collator("es", { numeric: true })

function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[]
): Element {
  return { type: "element", tagName, properties, children }
}

function text(value: string): ElementContent {
  return { type: "text", value }
}

function link(href: string, children: ElementContent[]): ElementContent {
  return element("a", { href }, children)
}

/** The table, or a notice when the type is missing or unknown. */
export function entitiesTable(
  attributes: MdxJsxFlowElement["attributes"],
  context: EntitiesContext
): { element: Element; problems: string[] } {
  const problems: string[] = []
  const options = readOptions(attributes, problems)
  const known = [...context.catalog.keys()].join(", ")
  if (options.type === null) {
    const message = `<${ENTITIES}> necesita type, uno de: ${known}`
    return { element: notice(message), problems: [...problems, message] }
  }
  const type = context.catalog.get(options.type)
  if (type === undefined) {
    const message = `<${ENTITIES} type="${options.type}">: no hay ese tipo en catalog/ (hay: ${known})`
    return { element: notice(message), problems: [...problems, message] }
  }
  for (const problem of type.problems)
    problems.push(`${problem.file}: ${problem.message}`)

  const fields = type.definition.campos
  const label = labelField(type.definition)
  const isColumn = (name: string) => name === ID_COLUMN || name in fields
  const unknownField = (name: string) =>
    problems.push(
      `<${ENTITIES} type="${type.id}">: ${type.id} no tiene el campo ${name}`
    )

  const group = groupFieldOf(options.group, fields, unknownField)
  const columns = columnsOf(options.columns, type.definition, label)
    .filter((name) => {
      if (isColumn(name)) return true
      if (options.columns !== null) unknownField(name)
      return false
    })
    .filter((name) => group === null || name !== group.name)

  const entities = [...type.entities.values()].sort((a, b) =>
    collator.compare(a.label, b.label)
  )
  const shown = { fields, label, context }
  const children: ElementContent[] = []
  if (entities.length === 0) {
    children.push(
      element("p", { className: ["doc-entities-empty"] }, [
        text(`No hay entradas en ${type.definition.plural}`),
      ])
    )
  } else if (group === null) {
    children.push(table(columns, entities, shown))
  } else {
    for (const block of groupsOf(entities, group, context)) {
      children.push(
        element("p", { className: ["doc-entities-group"] }, block.content),
        table(columns, block.entities, shown)
      )
    }
  }
  return {
    element: element("div", { className: ["doc-entities"] }, children),
    problems,
  }
}

/**
 * The table of some entities of a type, with the type's default columns
 * (`vista.columnas`, or the label and every field), ordered by label.
 */
export function typeTable(
  type: CatalogType,
  entities: readonly Entity[],
  context: EntitiesContext
): Element {
  const label = labelField(type.definition)
  const columns = columnsOf(null, type.definition, label).filter(
    (name) => name === ID_COLUMN || name in type.definition.campos
  )
  const sorted = [...entities].sort((a, b) =>
    collator.compare(a.label, b.label)
  )
  const shown = { fields: type.definition.campos, label, context }
  return element("div", { className: ["doc-entities"] }, [
    table(columns, sorted, shown),
  ])
}

function notice(message: string): Element {
  return element(
    "div",
    { className: ["doc-component-notice"], dataComponent: ENTITIES },
    [text(message)]
  )
}

function readOptions(
  attributes: MdxJsxFlowElement["attributes"],
  problems: string[]
): Options {
  const options: Options = { type: null, columns: null, group: null }
  for (const attribute of attributes) {
    if (attribute.type !== "mdxJsxAttribute") {
      problems.push(`<${ENTITIES}> no admite atributos entre llaves {…}`)
      continue
    }
    const { name, value } = attribute
    if (name !== "type" && name !== "columns" && name !== "group") {
      problems.push(`<${ENTITIES}> no tiene el atributo ${name}`)
      continue
    }
    if (typeof value !== "string") {
      problems.push(`El atributo ${name} de <${ENTITIES}> va entre comillas`)
      continue
    }
    options[name] = value
  }
  return options
}

/** `columns`, else the type's `vista.columnas`, else the label and every field. */
function columnsOf(
  written: string | null,
  definition: TypeDefinition,
  label: string
): string[] {
  if (written !== null)
    return written
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "")
  if (definition.vista !== undefined) return definition.vista.columnas
  const rest = Object.keys(definition.campos).filter((name) => name !== label)
  return [label, ...rest]
}

type GroupField = { name: string; field: FieldDefinition }

function groupFieldOf(
  name: string | null,
  fields: Readonly<Record<string, FieldDefinition>>,
  unknownField: (name: string) => void
): GroupField | null {
  if (name === null) return null
  const field = fields[name]
  if (field === undefined) {
    unknownField(name)
    return null
  }
  return { name, field }
}

type Shown = {
  fields: Readonly<Record<string, FieldDefinition>>
  label: string
  context: EntitiesContext
}

function table(
  columns: readonly string[],
  entities: readonly Entity[],
  shown: Shown
): Element {
  const head = element("thead", {}, [
    element(
      "tr",
      {},
      columns.map((name) =>
        element("th", {}, [text(columnLabel(name, shown.fields))])
      )
    ),
  ])
  const body = element(
    "tbody",
    {},
    entities.map((entity) =>
      element(
        "tr",
        {},
        columns.map((name) => element("td", {}, cellOf(entity, name, shown)))
      )
    )
  )
  return element("table", {}, [head, body])
}

/** A column's header: its field's label, or its name (`id`, `fuente`…). */
function columnLabel(
  name: string,
  fields: Readonly<Record<string, FieldDefinition>>
): string {
  const field = fields[name]
  if (field === undefined) return name
  return fieldLabel(name, field)
}

/** How the reader names a field: its `etiqueta`, or its name without one. */
export function fieldLabel(name: string, field: FieldDefinition): string {
  if (field.etiqueta !== undefined) return field.etiqueta
  return name
}

function cellOf(
  entity: Entity,
  column: string,
  shown: Shown
): ElementContent[] {
  if (column === shown.label) return entityName(entity, shown.context)
  if (column === ID_COLUMN) return [text(entity.id)]
  const field = shown.fields[column]
  if (field === undefined) return []
  return shownValue(entity.values[column], field, shown.context)
}

/** An entity's label, linked to its page or its catalog page. */
export function entityName(
  entity: Entity,
  context: Pick<EntitiesContext, "routeOf">
): ElementContent[] {
  return [link(context.routeOf(entityPagePath(entity)), [text(entity.label)])]
}

/** A value shown by its field kind; nothing for an absent one. */
export function shownValue(
  value: unknown,
  field: FieldDefinition,
  context: EntitiesContext
): ElementContent[] {
  if (value === undefined || value === null) return []
  switch (field.tipo) {
    case "booleano":
      return [text(yesNo(value))]
    case "url":
      if (typeof value !== "string") return []
      return [link(value, [text(value)])]
    case "email":
      if (typeof value !== "string") return []
      return [link(`mailto:${value}`, [text(value)])]
    case "ficha":
      if (typeof value !== "string") return []
      return [link(context.routeOf(value), [text(context.titleOf(value))])]
    case "ref":
      return refOf(value, field.a, context)
    case "lista":
      if (!Array.isArray(value)) return []
      return joined(
        value.map((item) => shownValue(item, field.de, context)),
        ", "
      )
    case "objeto":
      return objectOf(value, field.campos, context)
    default:
      return [text(plain(value))]
  }
}

function yesNo(value: unknown): string {
  if (value === true) return "Sí"
  return "No"
}

function plain(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

function refOf(
  value: unknown,
  typeId: string,
  context: EntitiesContext
): ElementContent[] {
  if (typeof value !== "string") return []
  const entity = context.catalog.get(typeId)?.entities.get(value)
  if (entity === undefined) return [text(value)]
  return entityName(entity, context)
}

function objectOf(
  value: unknown,
  fields: Readonly<Record<string, FieldDefinition>>,
  context: EntitiesContext
): ElementContent[] {
  if (typeof value !== "object" || value === null) return []
  const pairs: ElementContent[][] = []
  for (const [name, field] of Object.entries(fields)) {
    const shown = shownValue(Reflect.get(value, name), field, context)
    if (shown.length > 0) pairs.push([text(`${name}: `), ...shown])
  }
  return joined(pairs, "; ")
}

function joined(
  parts: readonly ElementContent[][],
  separator: string
): ElementContent[] {
  const result: ElementContent[] = []
  for (const part of parts) {
    if (part.length === 0) continue
    if (result.length > 0) result.push(text(separator))
    result.push(...part)
  }
  return result
}

type Group = {
  /** The shown value, `""` for the entities that leave the field out. */
  key: string
  rank: number
  content: ElementContent[]
  entities: Entity[]
}

/** One block per value: `valores` order for an enum, shown order otherwise. */
function groupsOf(
  entities: readonly Entity[],
  group: GroupField,
  context: EntitiesContext
): Group[] {
  const groups = new Map<string, Group>()
  for (const entity of entities) {
    const value = entity.values[group.name]
    const content = shownValue(value, group.field, context)
    const key = textOf(content)
    const existing = groups.get(key)
    if (existing !== undefined) {
      existing.entities.push(entity)
      continue
    }
    groups.set(key, {
      key,
      rank: rankOf(value, group.field),
      content: contentOrMissing(content, group.name),
      entities: [entity],
    })
  }
  return [...groups.values()].sort(byRankThenKey)
}

function contentOrMissing(
  content: ElementContent[],
  name: string
): ElementContent[] {
  if (content.length > 0) return content
  return [text(`Sin ${name}`)]
}

/** Enum values by their place in `valores`; the missing block always last. */
function rankOf(value: unknown, field: FieldDefinition): number {
  if (value === undefined || value === null) return Number.MAX_SAFE_INTEGER
  if (field.tipo !== "enum" || typeof value !== "string") return 0
  return field.valores.indexOf(value)
}

function byRankThenKey(a: Group, b: Group): number {
  if (a.rank !== b.rank) return a.rank - b.rank
  return collator.compare(a.key, b.key)
}

function textOf(content: readonly ElementContent[]): string {
  return content
    .map((node) => {
      if (node.type === "text") return node.value
      if (node.type === "element") return textOf(node.children)
      return ""
    })
    .join("")
}
