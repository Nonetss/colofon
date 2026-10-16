import type { Element, Root as HastRoot } from "hast"
import { defaultSchema, type Schema, sanitize } from "hast-util-sanitize"
import type { Root } from "mdast"
import { type Handler, toHast } from "mdast-util-to-hast"
import { NUMBER, NUMBERS, PATH_DATA, TRANSFORM } from "#diagrams/illustration"
import { componentMessage } from "#pages/transform"

// Turns a transformed page tree into the HTML tree the reader renders. The
// sanitizer at the end is the security boundary: whatever the content wrote,
// only the elements, attributes and URL schemes below reach the browser.

const drop: Handler = () => undefined

/** A component the platform doesn't provide (or not there), as a notice. */
function notice(tagName: "div" | "span"): Handler {
  return (_state, node) => {
    const name = jsxName(node)
    const element: Element = {
      type: "element",
      tagName,
      properties: {
        className: ["doc-component-notice"],
        dataComponent: name ?? "",
      },
      children: [
        { type: "text", value: componentMessage(name, placementOf(tagName)) },
      ],
    }
    return element
  }
}

function placementOf(tagName: "div" | "span"): "block" | "inline" {
  if (tagName === "span") return "inline"
  return "block"
}

function jsxName(node: unknown): string | null {
  if (typeof node !== "object" || node === null) return null
  if (!("name" in node) || typeof node.name !== "string") return null
  return node.name
}

const handlers = {
  mdxjsEsm: drop,
  mdxFlowExpression: drop,
  mdxTextExpression: drop,
  mdxJsxFlowElement: notice("div"),
  mdxJsxTextElement: notice("span"),
}

/** Classes of a drawn diagram's parts (`doc-diagram-node`, `-edge`…). */
const DIAGRAM_CLASS = /^doc-diagram-[a-z-]+$/

/**
 * What ties a drawing's parts together for the reader's highlighting: the
 * box, zone and arrow ids, a box's `trace` and `needs`, and the texts its
 * card shows. Their values are content text, never markup.
 */
const DIAGRAM_DATA = [
  "dataNode",
  "dataZone",
  "dataTrace",
  "dataNeeds",
  "dataEdge",
  "dataFrom",
  "dataTo",
  "dataToZone",
  "dataLabel",
  "dataInfo",
  "dataSeries",
  "dataValue",
]

/** An opacity between 0 and 1, as a typed form's ramps write it. */
const OPACITY = /^(0|1|0?\.\d+)$/

/**
 * What any shape may be painted with besides its class: an opacity, and in
 * a hand-drawn illustration (`diagrams/illustration.ts`, same patterns) a
 * transform, stroke details and `fill`/`stroke` set to `none`.
 */
const PAINT = [
  ["className", DIAGRAM_CLASS],
  ["fillOpacity", OPACITY],
  ["opacity", OPACITY],
  ["strokeOpacity", OPACITY],
  ["transform", TRANSFORM],
  ["strokeWidth", NUMBER],
  ["strokeDashArray", NUMBERS],
  ["strokeLineCap", "butt", "round", "square"],
  ["strokeLineJoin", "miter", "round", "bevel"],
  ["fill", "none"],
  ["stroke", "none"],
  ...DIAGRAM_DATA,
] satisfies NonNullable<Schema["attributes"]>[string]

const TEXT = [
  ...PAINT,
  "x",
  "y",
  "dx",
  "dy",
  ["textAnchor", "middle", "start", "end"],
  ["fontSize", NUMBER],
  ["fontWeight", NUMBER, "normal", "bold"],
] satisfies NonNullable<Schema["attributes"]>[string]

/**
 * The SVG a drawn, typed or hand-drawn diagram is made of: shapes, text and
 * links, with geometry, paint and its `data-*` attributes only. No styles,
 * ids, `use`, `foreignObject`, markers, references or event handlers.
 */
const DIAGRAM_SVG_ATTRIBUTES = {
  svg: [
    ["className", DIAGRAM_CLASS],
    "viewBox",
    "width",
    "height",
    "role",
    "ariaLabel",
  ],
  g: PAINT,
  rect: [...PAINT, "x", "y", "width", "height", "rx", "ry"],
  path: [...PAINT, ["d", PATH_DATA]],
  circle: [...PAINT, "cx", "cy", "r"],
  ellipse: [...PAINT, "cx", "cy", "rx", "ry"],
  line: [...PAINT, "x1", "y1", "x2", "y2"],
  polyline: [...PAINT, ["points", NUMBERS]],
  polygon: [...PAINT, ["points", NUMBERS]],
  text: TEXT,
  tspan: TEXT,
  title: [],
} satisfies NonNullable<Schema["attributes"]>

/** A link: GitHub's attributes, plus a diagram box's classes and data. */
const LINK_ATTRIBUTES: NonNullable<Schema["attributes"]>[string] = [
  ...(defaultSchema.attributes?.a ?? []).filter(
    (attribute) => !Array.isArray(attribute) || attribute[0] !== "className"
  ),
  ["className", "data-footnote-backref", DIAGRAM_CLASS],
  ...DIAGRAM_DATA,
]

/** What the reader may render: GitHub's schema plus the platform's marks. */
export const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  // Heading ids must match the table of contents and the links that point
  // at them; footnote ids already come prefixed by mdast-util-to-hast.
  clobber: ["name"],
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure",
    "figcaption",
    ...Object.keys(DIAGRAM_SVG_ATTRIBUTES),
  ],
  attributes: {
    ...defaultSchema.attributes,
    ...DIAGRAM_SVG_ATTRIBUTES,
    a: LINK_ATTRIBUTES,
    figure: [["className", "doc-diagram"], "dataDiagram", "dataDrawn"],
    ul: [
      "ariaDescribedBy",
      "ariaLabel",
      "ariaLabelledBy",
      [
        "className",
        "contains-task-list",
        "doc-diagram-zones",
        "doc-diagram-connections",
      ],
    ],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id"],
    h3: ["id"],
    h4: ["id"],
    div: [
      [
        "className",
        "doc-diagram-canvas",
        "doc-diagram-text",
        "doc-alert",
        /^doc-alert-[a-z]+$/,
        "doc-component-notice",
        "doc-entities",
      ],
      "dataComponent",
    ],
    p: [
      [
        "className",
        "doc-alert-title",
        "doc-entities-group",
        "doc-entities-empty",
        "doc-entity-source",
      ],
    ],
    span: [
      [
        "className",
        "doc-component-notice",
        "doc-broken-link",
        "doc-broken-image",
      ],
      "dataComponent",
    ],
  },
}

/** The sanitized HTML tree of a transformed page. */
export function pageToHast(tree: Root): HastRoot {
  const hast = toHast(tree, { handlers })
  const clean = sanitize(hast, SANITIZE_SCHEMA)
  if (clean.type === "root") return clean
  return { type: "root", children: [] }
}
