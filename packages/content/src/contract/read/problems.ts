import { z } from "zod"
import { type ContractReading, pathFor } from "#contract/versions/v1"

// The problems the platform reports, shared by every area: one in a
// declaration or catalog file, and one in a page (or anything shown on a
// page), which also says its line. Messages are in Spanish.

/** A problem in one file, with a path relative to the content root. */
export type ContentProblem = { file: string; message: string }

/** A problem in one page, with the line it is on when there is one. */
export type PageProblem = {
  /** Path relative to the content root (`docs/red/dns.mdx`). */
  file: string
  line: number | null
  message: string
}

/** Zod's Spanish messages, as the editor and the platform report them. */
export const spanishErrors = z.locales.es().localeError

/**
 * An issue as the platform reports it, its path under the names the file
 * holds when `reading` is given.
 */
export function describeIssue(
  issue: z.core.$ZodIssue,
  reading?: ContractReading
): string {
  if (issue.path.length === 0) return issue.message
  return `${issuePathOf(issue, reading).join(".")}: ${issue.message}`
}

function issuePathOf(
  issue: z.core.$ZodIssue,
  reading: ContractReading | undefined
): PropertyKey[] {
  if (reading === undefined) return issue.path
  return pathFor(reading.contract, reading.file, issue.path)
}
