import { z } from "zod"

/** A page or section as a link in the navigation. */
const navEntry = {
  path: z
    .string()
    .describe("Page path under docs/ without .mdx; empty for the home"),
  href: z.string().describe("Reader route of the page"),
  title: z.string(),
  description: z.string(),
  icon: z.string().nullable().describe("Lucide icon name from `icono`"),
}

type NavEntry = {
  path: string
  href: string
  title: string
  description: string
  icon: string | null
}

export type DocsNavNode =
  | ({ kind: "page" } & NavEntry)
  | ({ kind: "section"; children: DocsNavNode[] } & NavEntry)
  | {
      kind: "group"
      title: string
      description: string
      icon: string | null
      children: DocsNavNode[]
    }

const navPage = z.object({ kind: z.literal("page"), ...navEntry })

const navGroup = z
  .object({
    kind: z.literal("group"),
    title: z.string(),
    description: z.string(),
    icon: z.string().nullable().describe("Lucide icon name from menu.yaml"),
    get children() {
      return z.array(navNode)
    },
  })
  .describe("A group of menu.yaml: a heading, not a route")

const navSection = z.object({
  kind: z.literal("section"),
  ...navEntry,
  get children() {
    return z.array(navNode)
  },
})

// Annotated: a recursive schema can't infer its own type.
const navNode: z.ZodType<DocsNavNode, DocsNavNode> = z.union([
  navPage,
  navSection,
  navGroup,
])

const pageLink = z.object({
  path: z.string(),
  href: z.string(),
  title: z.string(),
})

const breadcrumb = z
  .object({
    path: z.string().nullable(),
    href: z.string().nullable(),
    title: z.string(),
  })
  .describe("A section above the page, or a group of menu.yaml (no path)")

const hastProperties = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number()])),
  ])
)

type HastProperties = z.infer<typeof hastProperties>

export type DocsHastText = { type: "text"; value: string }

export type DocsHastElement = {
  type: "element"
  tagName: string
  properties: HastProperties
  children: DocsHastContent[]
}

export type DocsHastContent = DocsHastElement | DocsHastText

const hastText = z.object({ type: z.literal("text"), value: z.string() })

const hastElement = z.object({
  type: z.literal("element"),
  tagName: z.string(),
  properties: hastProperties,
  get children() {
    return z.array(hastContent)
  },
})

// Annotated: a recursive schema can't infer its own type.
const hastContent: z.ZodType<DocsHastContent, DocsHastContent> = z.union([
  hastElement,
  hastText,
])

const hastRoot = z
  .object({ type: z.literal("root"), children: z.array(hastContent) })
  .describe(
    "Sanitized HTML tree (hast) of the page body: elements and text only"
  )

const problem = z.object({
  file: z.string().describe("Path relative to the content root"),
  line: z.number().nullable(),
  message: z.string().describe("What is wrong, in Spanish"),
})

const headerValue = z.object({
  text: z.string(),
  href: z
    .string()
    .nullable()
    .describe("Reader route for a `ficha` value, or an entity's catalog page"),
})

export const docsOutput = {
  nav: z.object({
    repositories: z.array(
      z.object({
        slug: z.string(),
        name: z.string().describe("Display name of the stored repository"),
        title: z
          .string()
          .nullable()
          .describe("`nombre` of doc.config.yaml; null without content"),
        description: z
          .string()
          .nullable()
          .describe("`descripcion` of doc.config.yaml"),
        available: z
          .boolean()
          .describe("Whether the repository has readable content"),
        home: z.object(navEntry).nullable(),
        nodes: z.array(navNode),
      })
    ),
  }),
  page: z.object({
    repository: z.object({ slug: z.string(), name: z.string() }),
    path: z.string(),
    href: z.string(),
    source: z
      .enum(["file", "folder", "generated"])
      .describe(
        "`folder` for a section without index.mdx; `generated` for a catalog page"
      ),
    header: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().nullable(),
      updated: z.string().nullable().describe("`actualizado`, YYYY-MM-DD"),
      edited: z
        .string()
        .nullable()
        .describe(
          "Date of the last commit that touched the page's file, YYYY-MM-DD; null for pages that come from no file"
        ),
      fields: z
        .array(
          z.object({
            name: z.string(),
            label: z
              .string()
              .describe("The field's `etiqueta`, or its name without one"),
            values: z.array(headerValue),
          })
        )
        .describe("The site's own header fields (`cabecera`) that are set"),
    }),
    tree: hastRoot
      .nullable()
      .describe("Null when the body could not be parsed, or for a folder"),
    headings: z.array(
      z.object({
        depth: z.union([z.literal(2), z.literal(3)]),
        id: z.string(),
        text: z.string(),
      })
    ),
    breadcrumbs: z.array(breadcrumb),
    previous: pageLink.nullable(),
    next: pageLink.nullable(),
    children: z
      .array(navNode)
      .describe("A section's pages and subsections; empty for a page"),
    hasProblems: z.boolean(),
    problems: z
      .array(problem)
      .describe("The page's problems; only admins get them, others get []"),
    styles: z
      .string()
      .nullable()
      .describe(
        "The repository's cleaned stylesheet from its styles/ modules, the same for every page of the repository, applied over the platform's styles; null when it has none"
      ),
  }),
  file: z.file().describe("The image file"),
  search: z.object({
    allRepositories: z
      .boolean()
      .describe(
        "Whether more than one repository was searched, so results come from several"
      ),
    results: z.array(
      z.object({
        repository: z.object({ slug: z.string(), name: z.string() }),
        path: z
          .string()
          .describe("Page path under docs/ without .mdx; empty for the home"),
        href: z
          .string()
          .describe(
            "Reader route of the page, at the heading of the section that holds the match when there is one"
          ),
        title: z.string(),
        description: z.string(),
        trail: z
          .array(z.string())
          .describe("Groups and sections above the page, outermost first"),
        excerpt: z
          .object({
            text: z.string(),
            highlights: z
              .array(z.object({ start: z.number(), end: z.number() }))
              .describe("Matched words, as offsets into `text`"),
          })
          .nullable()
          .describe(
            "The text around the match; null when every word is in the title, description, header fields or trail"
          ),
        terms: z
          .array(z.string())
          .describe(
            "The query's words as typed, folded; the page holds every one"
          ),
      })
    ),
  }),
}
