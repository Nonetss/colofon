import GithubSlugger from "github-slugger"
import type { Element, ElementContent, Root } from "hast"
import { sanitize } from "hast-util-sanitize"
import {
  type Catalog,
  type CatalogType,
  type Entity,
  entityFile,
} from "#contract/catalog"
import { catalogTypePath, entityPath } from "#contract/catalog-paths"
import { CATALOG_PATH } from "#contract/load"
import type { PageProblem } from "#contract/problems"
import {
  type EntitiesContext,
  entityName,
  fieldLabel,
  shownValue,
  typeTable,
} from "#pages/entities"
import type { ReverseRefs } from "#pages/references"
import { SANITIZE_SCHEMA } from "#pages/to-hast"
import type { Page, PageHeader, PageHeading } from "#pages/types"

// The reader pages the platform makes for the catalog, with no MDX behind
// them: `catalog` (every type), `catalog/<type>` (its table) and
// `catalog/<type>/<id>` (one entity: its fields and source, the pages that cite it,
// the entities that point at it and the diagrams it is in). They are plain
// `Page`s, so the reader serves them like any page of docs/. Their headers
// come first, so the navigation can list them; their bodies need the
// reading order and the citations, so they are filled in afterwards.

/** The title of the catalog's own page and section. */
export const CATALOG_TITLE = "Catálogo"

/**
 * Every generated catalog page, by path, with its header and no body yet.
 * An entity's page is dated with its file's entry in `editDates`.
 */
export function catalogPages(
  catalog: Catalog,
  editDates: ReadonlyMap<string, string>
): Map<string, Page> {
  const pages = new Map<string, Page>()
  pages.set(CATALOG_PATH, generated(CATALOG_PATH, catalogHeader()))
  for (const type of catalog.values()) {
    const typePath = catalogTypePath(type.id)
    pages.set(typePath, generated(typePath, typeHeader(type)))
    for (const entity of type.entities.values()) {
      const pagePath = entityPath(type.id, entity.id)
      const editado = editDates.get(entityFile(type.id, entity.id)) ?? null
      pages.set(
        pagePath,
        generated(pagePath, entityHeader(type, entity, editado))
      )
    }
  }
  return pages
}

/** What the bodies of the catalog pages show besides the catalog itself. */
export type CatalogBodyContext = EntitiesContext & {
  /** For each entity's page path, the pages citing it, in reading order. */
  citations: ReadonlyMap<string, readonly string[]>
  reverse: ReverseRefs
  /** The diagrams an entity is a node of, rendered, by its page path. */
  diagramsOf: (entityPagePath: string) => Element[]
}

/** The page with its body: the table, list and sections it shows. */
export function withCatalogBody(page: Page, context: CatalogBodyContext): Page {
  const [, typeId, id] = page.path.split("/")
  if (typeId === undefined) return withBody(page, catalogBody(context), [])
  const type = context.catalog.get(typeId)
  if (type === undefined) return page
  if (id === undefined)
    return withBody(page, typeBody(type, context), typeProblems(type))
  const entity = type.entities.get(id)
  if (entity === undefined) return page
  return withBody(page, entityBody(type, entity, context), [])
}

function withBody(
  page: Page,
  children: ElementContent[],
  problems: PageProblem[]
): Page {
  const clean = sanitize({ type: "root", children }, SANITIZE_SCHEMA)
  const tree: Root = { type: "root", children: rootChildren(clean) }
  return {
    ...page,
    tree,
    headings: headingsOf(tree),
    problems: [...page.problems, ...problems],
  }
}

function rootChildren(node: ReturnType<typeof sanitize>): Root["children"] {
  if (node.type === "root") return node.children
  return []
}

function generated(pagePath: string, header: PageHeader): Page {
  return { path: pagePath, header, tree: null, headings: [], problems: [] }
}

function header(
  titulo: string,
  descripcion: string,
  icono: string | null
): PageHeader {
  return {
    titulo,
    descripcion,
    icono,
    orden: null,
    actualizado: null,
    editado: null,
    campos: {},
  }
}

function catalogHeader(): PageHeader {
  return header(
    CATALOG_TITLE,
    "Los datos del sitio: cada tipo del catálogo con sus entidades",
    "database"
  )
}

function typeHeader(type: CatalogType): PageHeader {
  return header(
    type.definition.plural,
    typeDescription(type),
    type.definition.icono ?? null
  )
}

function typeDescription(type: CatalogType): string {
  if (type.definition.descripcion !== undefined)
    return type.definition.descripcion
  return `Datos de ${type.definition.plural}`
}

function entityHeader(
  type: CatalogType,
  entity: Entity,
  editado: string | null
): PageHeader {
  return {
    ...header(
      entity.label,
      type.definition.nombre,
      type.definition.icono ?? null
    ),
    actualizado: dateOf(entity.values.actualizado),
    editado,
  }
}

function dateOf(value: unknown): string | null {
  if (typeof value === "string") return value
  return null
}

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

function link(href: string, value: string): Element {
  return element("a", { href }, [text(value)])
}

function row(tagName: "th" | "td", contents: ElementContent[][]): Element {
  return element(
    "tr",
    {},
    contents.map((content) => element(tagName, {}, content))
  )
}

/** A table: its header row, then its rows; an empty header makes it key/value. */
function tableOf(head: string[], rows: ElementContent[][][]): Element {
  return element("table", {}, [
    element("thead", {}, [
      row(
        "th",
        head.map((name) => [text(name)])
      ),
    ]),
    element(
      "tbody",
      {},
      rows.map((cells) => row("td", cells))
    ),
  ])
}

/** The catalog page: one row per type with how many entities have a page. */
function catalogBody(context: CatalogBodyContext): ElementContent[] {
  const types = [...context.catalog.values()]
  if (types.length === 0)
    return [element("p", {}, [text("El catálogo no tiene ningún tipo")])]
  const rows = types.map((type) => {
    const entities = [...type.entities.values()]
    const withPage = entities.filter((entity) => entity.page !== null)
    return [
      [link(context.routeOf(catalogTypePath(type.id)), type.definition.plural)],
      [text(type.definition.descripcion ?? "")],
      [text(String(entities.length))],
      [text(String(withPage.length))],
    ]
  })
  return [tableOf(["Tipo", "Descripción", "Entidades", "Con página"], rows)]
}

/** A type's page: its table, every entity linked to its page. */
function typeBody(
  type: CatalogType,
  context: CatalogBodyContext
): ElementContent[] {
  const entities = [...type.entities.values()]
  if (entities.length === 0)
    return [
      element("p", { className: ["doc-entities-empty"] }, [
        text(`No hay entradas en ${type.definition.plural}`),
      ]),
    ]
  return [typeTable(type, entities, context)]
}

/** The entity files of a type that failed its schema, as the page's problems. */
function typeProblems(type: CatalogType): PageProblem[] {
  return type.problems.map((problem) => ({
    file: problem.file,
    line: null,
    message: problem.message,
  }))
}

/** An entity's page: fields, its page, who cites it, who points at it, diagrams. */
function entityBody(
  type: CatalogType,
  entity: Entity,
  context: CatalogBodyContext
): ElementContent[] {
  const pagePath = entityPath(type.id, entity.id)
  const body: ElementContent[] = [fieldsTable(type, entity, context)]
  const source = entity.values.fuente
  if (typeof source === "string")
    body.push(
      element("p", { className: ["doc-entity-source"] }, [
        text(`Fuente: ${source}`),
      ])
    )
  if (entity.page !== null) {
    body.push(
      element("p", {}, [
        text("Página: "),
        link(context.routeOf(entity.page), context.titleOf(entity.page)),
      ])
    )
  }

  const citing = context.citations.get(pagePath) ?? []
  if (citing.length > 0) {
    body.push(
      heading(2, "Páginas que la citan"),
      element(
        "ul",
        {},
        citing.map((citer) =>
          element("li", {}, [
            link(context.routeOf(citer), context.titleOf(citer)),
          ])
        )
      )
    )
  }

  const referencing = context.reverse.get(pagePath)
  if (referencing !== undefined && referencing.size > 0) {
    body.push(heading(2, "Referencias"))
    for (const [typeId, entities] of referencing) {
      const from = context.catalog.get(typeId)
      if (from === undefined) continue
      body.push(
        heading(3, from.definition.plural),
        typeTable(from, entities, context)
      )
    }
  }

  const diagrams = context.diagramsOf(pagePath)
  if (diagrams.length > 0) body.push(heading(2, "Diagramas"), ...diagrams)
  return body
}

/**
 * One row per declared field the entity sets, in declaration order, named by
 * its label. `fuente` goes in a note under it and `actualizado` in the header.
 */
function fieldsTable(
  type: CatalogType,
  entity: Entity,
  context: CatalogBodyContext
): Element {
  const rows: ElementContent[][][] = []
  for (const [name, field] of Object.entries(type.definition.campos)) {
    const shown = shownValue(entity.values[name], field, context)
    if (shown.length > 0) rows.push([[text(fieldLabel(name, field))], shown])
  }
  if (rows.length === 0) rows.push([[text("id")], entityName(entity, context)])
  return tableOf(["", ""], rows)
}

/** A heading; its id is set when the tree's headings are read. */
function heading(depth: 2 | 3, value: string): Element {
  return element(`h${depth}`, {}, [text(value)])
}

/** Gives every level 2 and 3 heading an id and lists them, in order. */
function headingsOf(tree: Root): PageHeading[] {
  const slugger = new GithubSlugger()
  const headings: PageHeading[] = []
  for (const node of tree.children) {
    if (node.type !== "element") continue
    const depth = headingDepth(node.tagName)
    if (depth === null) continue
    const value = plainText(node.children)
    const id = slugger.slug(value)
    node.properties = { ...node.properties, id }
    headings.push({ depth, id, text: value })
  }
  return headings
}

function headingDepth(tagName: string): 2 | 3 | null {
  if (tagName === "h2") return 2
  if (tagName === "h3") return 3
  return null
}

function plainText(children: readonly ElementContent[]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value
      if (child.type === "element") return plainText(child.children)
      return ""
    })
    .join("")
}
