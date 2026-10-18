/** A problem in one page, with the line it is on when there is one. */
export type PageProblem = {
  /** Path relative to the content root (`docs/red/dns.mdx`). */
  file: string
  line: number | null
  message: string
}
