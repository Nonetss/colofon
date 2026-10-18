import type { Root } from "hast"
import type { PageProblem } from "#contract/problems"

/** What every page's header gives, after validation. */
export type PageHeader = {
  title: string
  description: string
  icon: string | null
  order: number | null
  updated: string | null
  /**
   * The date of the last commit that touched the page's file, from git;
   * never written in the file. `null` for pages that come from no file.
   */
  editado: string | null
  /** The site's own header fields (`header`), the valid ones only. */
  fields: Record<string, unknown>
}

/** A level 2 or 3 heading of a page, for its table of contents. */
export type PageHeading = { depth: 2 | 3; id: string; text: string }

/** A page read from its file: header, render tree and what went wrong. */
export type Page = {
  /** Path under `docs/` without `.mdx`; `""` for `docs/index.mdx`. */
  path: string
  header: PageHeader
  /** The sanitized render tree; `null` when the body could not be parsed. */
  tree: Root | null
  headings: PageHeading[]
  problems: PageProblem[]
}
