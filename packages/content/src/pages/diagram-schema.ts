import { z } from "zod"
import { enumOf } from "#enum-of"

// The shape of a diagram file, `diagramas/<id>.json`, in the format of the
// reference site's scheme drawer (`lib.mjs`): the content gives every
// position. The same pieces check each part of a file while it is read
// (`diagrams.ts`, so one bad box never hides the rest) and make the editor's
// JSON Schema (`editor-schemas.ts`).

/** The id of a box or zone: lowercase letters, digits and single hyphens. */
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Kinds of box, from most to least important, as the legend lists them. */
export const NODE_KINDS = [
  "focal",
  "service",
  "store",
  "input",
  "external",
  "optional",
] as const

export const SHAPES = ["pill", "cylinder"] as const

export const EDGE_KINDS = ["default", "accent", "dash"] as const

export const ANCHORS = ["middle", "start", "end"] as const

/** The colours a box, zone or arrow can take. */
export const HUES = [
  "rose",
  "blue",
  "cyan",
  "violet",
  "green",
  "indigo",
  "fuchsia",
  "slate",
  "teal",
  "lime",
] as const

export type NodeKind = (typeof NODE_KINDS)[number]
export type Shape = (typeof SHAPES)[number]
export type EdgeKind = (typeof EDGE_KINDS)[number]
export type Anchor = (typeof ANCHORS)[number]
export type Hue = (typeof HUES)[number]

/** The keys every diagram accepts, whichever its form. */
export const COMMON_KEYS = [
  "$schema",
  "title",
  "desc",
  "kindNames",
  "edgeNames",
  "badgeName",
  "shapes",
  "colorEdges",
] as const

/** The keys of a drawn diagram, besides the common ones. */
export const DRAWN_KEYS = [
  "width",
  "height",
  "nodes",
  "edges",
  "zones",
  "notes",
] as const

/** The keys of a chain, besides the common ones. */
export const CHAIN_KEYS = [
  "items",
  "links",
  "accent",
  "dash",
  "y",
  "h",
] as const

const text = z.string().min(1)

const point = z
  .tuple([z.number(), z.number()])
  .meta({ description: "[x, y] en píxeles del dibujo" })

const id = z.string().regex(ID_PATTERN, {
  error: "Un id va en minúsculas, sin acentos y con guiones (red-de-casa)",
})

const row = z.strictObject({
  key: text.optional().meta({ description: "Una marca corta: PK, FK, UQ…" }),
  name: text.meta({ description: "El nombre de la columna" }),
  type: text.optional().meta({ description: "Su tipo, a la derecha" }),
})

/** What a reference to the catalog or to a page accepts. */
type References = {
  /** Every `<type>/<id>` of the catalog, for the editor. */
  entityKeys?: readonly string[]
  /** Every page path of the repository, for the editor. */
  pagePaths?: readonly string[]
}

function entityRef(entityKeys: readonly string[] | undefined) {
  if (entityKeys === undefined)
    return z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, {
      error: "Es <tipo>/<id> de una entidad del catálogo (machines/nas)",
    })
  return enumOf(entityKeys, "No hay ninguna entidad en catalogo/")
}

function pageRef(pagePaths: readonly string[] | undefined) {
  if (pagePaths === undefined) return z.string()
  return enumOf(pagePaths, "No hay ninguna página en docs/")
}

/**
 * The schemas of a diagram file and of each of its parts. With `references`
 * the editor gets the entities and pages a box can link to; without them
 * they are checked against the content when the file is read.
 */
export function diagramSchemas(references: References = {}) {
  const boxFields = {
    id: id.optional().meta({
      description: "Lo que nombran las flechas (from, to), zone y needs",
    }),
    kind: z.enum(NODE_KINDS).optional().meta({
      description:
        "focal: la pieza central; service (por defecto); store: datos o destino; input: usuario u origen; external; optional: sin uso",
    }),
    tag: text.optional().meta({ description: "Etiqueta enmarcada arriba" }),
    name: text.optional().meta({
      description: "El nombre de la caja; con entity, por defecto el suyo",
    }),
    sub: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .meta({
        description: "Una línea, o varias, bajo el nombre",
      }),
    shape: z.enum(SHAPES).optional().meta({
      description:
        "pill: de dónde llega la gente; cylinder: dónde acaban los datos",
    }),
    hue: z.enum(HUES).optional().meta({
      description: "Su color; sin él, el de su zona",
    }),
    zone: z
      .string({
        error: "Una caja está en una zona: el id de esa zona",
      })
      .optional()
      .meta({ description: "El id de la zona en la que está" }),
    info: text.optional().meta({
      description: "Lo que dice la tarjeta al pasar por encima",
    }),
    trace: z.boolean().optional().meta({
      description:
        "true: al pasar, ilumina todo lo que alcanza por el camino principal",
    }),
    needs: z.array(z.string()).optional().meta({
      description: "Ids de las cajas de las que depende: si caen, cae esta",
    }),
    entity: entityRef(references.entityKeys).optional().meta({
      description:
        "La entidad del catálogo que es (<tipo>/<id>): enlaza a su ficha",
    }),
    page: pageRef(references.pagePaths).optional().meta({
      description: "La página del repositorio a la que enlaza",
    }),
    rows: z.array(row).optional().meta({
      description: "Una tabla: sus columnas, con key, name y type",
    }),
    more: text.optional().meta({
      description: 'Línea final de una tabla ("+ 8 columnas más")',
    }),
  }
  const box = z.strictObject({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive().optional().meta({
      description: "Su alto; una tabla no lo lleva, sale de sus filas",
    }),
    ...boxFields,
  })
  const item = z.strictObject({
    w: z.number().positive().optional().meta({
      description: "Su ancho; por defecto, el que cabe su línea más larga",
    }),
    h: z.number().positive().optional(),
    ...boxFields,
  })
  const edge = z.strictObject({
    points: z.array(point).min(2).optional().meta({
      description:
        "Los puntos por los que pasa, en tramos horizontales o verticales",
    }),
    from: z
      .string()
      .optional()
      .meta({ description: "El id de la caja de la que sale" }),
    to: z
      .string()
      .optional()
      .meta({ description: "El id de la caja a la que llega" }),
    toZone: z.string().optional().meta({
      description: "El id de la zona entera a la que llega",
    }),
    kind: z.enum(EDGE_KINDS).optional().meta({
      description:
        "default; accent: el camino principal; dash: opcional o aviso",
    }),
    label: text.optional().meta({ description: "Lo que viaja por ella" }),
    at: point.optional().meta({
      description: "Dónde va su etiqueta: [x, y] de la línea base",
    }),
    anchor: z.enum(ANCHORS).optional(),
    hue: z.enum(HUES).optional(),
    info: text.optional(),
    noHead: z.boolean().optional().meta({ description: "true: sin punta" }),
    badge: text.optional().meta({
      description: "Sin línea: una insignia con este texto en la caja from",
    }),
  })
  const zone = z.strictObject({
    id: id.optional(),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    label: text.meta({ description: "Su título" }),
    hue: z.enum(HUES).optional(),
  })
  const note = z.strictObject({
    x: z.number(),
    y: z.number(),
    text: text,
    anchor: z.enum(ANCHORS).optional(),
  })
  const kindNames = z.partialRecord(z.enum(NODE_KINDS), text).meta({
    description: "Cómo llama la leyenda a cada tipo de caja en este diagrama",
  })
  const edgeNames = z.partialRecord(z.enum(EDGE_KINDS), text).meta({
    description: "Cómo llama la leyenda a cada tipo de flecha en este diagrama",
  })
  const shapes = z.partialRecord(z.enum(NODE_KINDS), z.enum(SHAPES)).meta({
    description: "La forma de cada tipo de caja que no lleve la suya",
  })
  const indexes = z.array(z.number().int().nonnegative())
  const common = {
    $schema: z.string().optional(),
    title: text.meta({ description: "El título del diagrama" }),
    desc: text.meta({
      description: "Qué muestra, en una o dos frases: es su texto alternativo",
    }),
    kindNames: kindNames.optional(),
    edgeNames: edgeNames.optional(),
    badgeName: text.optional().meta({
      description: "Cómo llama la leyenda a las insignias",
    }),
    shapes: shapes.optional(),
    colorEdges: z.boolean().optional().meta({
      description: "true: cada flecha toma el color de la caja de la que sale",
    }),
  }
  const drawn = z.strictObject({
    ...common,
    width: z.number().positive().meta({ description: "El ancho del dibujo" }),
    height: z.number().positive().meta({
      description: "El alto del dibujo, sin la leyenda",
    }),
    nodes: z.array(box).min(1),
    edges: z.array(edge).optional(),
    zones: z.array(zone).optional(),
    notes: z.array(note).optional(),
  })
  const chain = z.strictObject({
    ...common,
    items: z.array(item).min(1).meta({
      description: "Las cajas, puestas en fila de izquierda a derecha",
    }),
    links: z
      .array(z.union([text, z.null()]))
      .optional()
      .meta({
        description: "La etiqueta de cada flecha entre dos cajas, o null",
      }),
    accent: indexes.optional().meta({
      description: "Qué flechas (0 la primera) son del camino principal",
    }),
    dash: indexes.optional().meta({ description: "Qué flechas van a trazos" }),
    y: z.number().optional(),
    h: z.number().positive().optional(),
  })
  return {
    box,
    item,
    edge,
    zone,
    note,
    kindNames,
    edgeNames,
    shapes,
    indexes,
    chainLinks: z.array(z.union([text, z.null()])),
    file: z.union([drawn, chain]),
  }
}
