import { openapi } from "@orpc/openapi"
import { protectedProcedure } from "#index"
import { contentReader, repositoryStore } from "#v1/content/handler"
import { createDocsHandler } from "#v1/docs/handler"
import { docsInput } from "#v1/docs/input"
import { docsOutput } from "#v1/docs/output"

const docsHandler = createDocsHandler({
  reader: contentReader,
  repositories: repositoryStore,
})

const tags = ["Docs"]

export const docsRouter = {
  nav: protectedProcedure
    .meta(
      openapi({
        summary: "Documentation navigation",
        description:
          "Every content repository, ordered by name, with its doc.config.yaml name and description and its tree of sections and pages, as the reader's sidebar shows it. A repository without readable content (not synced yet, or invalid) is listed with `available: false` and no tree.",
        tags,
        method: "GET",
      })
    )
    .output(docsOutput.nav)
    .handler(() => docsHandler.nav()),

  page: protectedProcedure
    .meta(
      openapi({
        summary: "Read a documentation page",
        description:
          "One page of a content repository by its path (empty for the home): its header, the sanitized HTML tree of its body, headings, breadcrumbs, previous and next pages, for a section its pages, and the repository's cleaned stylesheet (`styles`, from its estilos/ modules, or null). Problems are listed only for admins. NOT_FOUND for an unknown repository, one without content, or a page that doesn't exist.",
        tags,
        method: "GET",
      })
    )
    .input(docsInput.page)
    .output(docsOutput.page)
    .handler(({ context, input }) => docsHandler.page({ context, input })),

  search: protectedProcedure
    .meta(
      openapi({
        summary: "Search the documentation pages",
        description:
          "Full-text search over the pages the navigation lists (home, pages, sections and catalog type pages; not entity pages) of one repository, or of every readable repository when `repository` is missing or names none. A page matches when it holds every word of the query, by prefix or, for words of five letters or more, with one typo. Results are ranked by where the words appear (title, then headings, then description, header fields and trail, then body); a match in a heading or the body comes with an excerpt and a route to its section.",
        tags,
        method: "GET",
      })
    )
    .input(docsInput.search)
    .output(docsOutput.search)
    .handler(({ input }) => docsHandler.search({ input })),

  file: protectedProcedure
    .meta(
      openapi({
        summary: "Read an image of a documentation repository",
        description:
          "An image file (png, jpg, gif, webp, avif or svg, up to 10 MiB) under a content repository's docs/, as pages link it. NOT_FOUND for an unknown repository, a missing file, another kind of file or a path outside docs/.",
        tags,
        method: "GET",
        path: "/v1/docs/{repository}/files/{+path}",
      })
    )
    .input(docsInput.file)
    .output(docsOutput.file)
    .handler(({ context, input }) => docsHandler.file({ context, input })),
}
