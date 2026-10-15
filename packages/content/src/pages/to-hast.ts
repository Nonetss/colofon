import type { Element, Root as HastRoot } from "hast"
import { defaultSchema, type Schema, sanitize } from "hast-util-sanitize"
import type { Root } from "mdast"
import { type Handler, toHast } from "mdast-util-to-hast"
import { componentMessage } from "#pages/transform"

// Turns a transformed page tree into the HTML tree the reader renders. The
// sanitizer at the end is the security boundary: whatever the content wrote,
// only the elements, attributes and URL schemes below reach the browser.

const drop: Handler = () => undefined

/** A component the platform doesn't provide, rendered as a notice. */
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
      children: [{ type: "text", value: componentMessage(name) }],
    }
    return element
  }
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

/** What the reader may render: GitHub's schema plus the platform's marks. */
export const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  // Heading ids must match the table of contents and the links that point
  // at them; footnote ids already come prefixed by mdast-util-to-hast.
  clobber: ["name"],
  attributes: {
    ...defaultSchema.attributes,
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id"],
    h3: ["id"],
    h4: ["id"],
    div: [
      ["className", "doc-alert", /^doc-alert-[a-z]+$/, "doc-component-notice"],
      "dataComponent",
    ],
    p: [["className", "doc-alert-title"]],
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
