import type { Root } from "hast"

/** A problem in one page, with the line it is on when there is one. */
export type PageProblem = {
  /** Path relative to the content root (`docs/red/dns.mdx`). */
  file: string
  line: number | null
  message: string
}

/** What every page's header gives, after validation. */
export type PageHeader = {
  titulo: string
  descripcion: string
  icono: string | null
  orden: number | null
  actualizado: string | null
  /**
   * The date of the last commit that touched the page's file, from git;
   * never written in the file. `null` for pages that come from no file.
   */
  editado: string | null
  /** The site's own header fields (`cabecera`), the valid ones only. */
  campos: Record<string, unknown>
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
