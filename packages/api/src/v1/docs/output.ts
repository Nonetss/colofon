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

const navPage = z.object({ kind: z.literal("page"), ...navEntry })

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
])

const pageLink = z.object({
  path: z.string(),
  href: z.string(),
  title: z.string(),
})

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
  href: z.string().nullable().describe("Reader route for a `ficha` value"),
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
      .enum(["file", "folder"])
      .describe("`folder` for a section without index.mdx"),
    header: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().nullable(),
      updated: z.string().nullable().describe("`actualizado`, YYYY-MM-DD"),
      fields: z
        .array(z.object({ name: z.string(), values: z.array(headerValue) }))
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
    breadcrumbs: z.array(pageLink),
    previous: pageLink.nullable(),
    next: pageLink.nullable(),
    children: z
      .array(navNode)
      .describe("A section's pages and subsections; empty for a page"),
    hasProblems: z.boolean(),
    problems: z
      .array(problem)
      .describe("The page's problems; only admins get them, others get []"),
  }),
  file: z.file().describe("The image file"),
}
