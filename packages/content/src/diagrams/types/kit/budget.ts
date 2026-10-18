import type { Report } from "#diagrams/report"

// The complexity budgets of diagram-design's types: a diagram that holds
// more than its type's limits is reported, once per limit, and still drawn
// whole. The accent is for one or two things the reader should see first.

/** One limit: at most `max` of `what` ("nodos"). */
export type Limit = { max: number; what: string }

/**
 * Reports every count over its limit, as "Un Sankey lleva como mucho 8
 * nodos y este tiene 10: pártelo en dos diagramas".
 */
export function checkBudget(
  label: string,
  limits: readonly Limit[],
  counts: readonly number[],
  report: Report
) {
  limits.forEach((limit, index) => {
    const count = counts[index] ?? 0
    if (count > limit.max)
      report(
        "",
        `${label} lleva como mucho ${limit.max} ${limit.what} y este tiene ${count}: pártelo en dos diagramas`
      )
  })
}

/** The most elements a diagram draws in the accent. */
const MAX_ACCENTS = 2

/** Reports a diagram with more than two elements in the accent. */
export function checkAccents(count: number, report: Report) {
  if (count > MAX_ACCENTS)
    report(
      "",
      `Como mucho ${MAX_ACCENTS} elementos van en el color de acento y este diagrama tiene ${count}: deja solo lo que el lector debe ver primero`
    )
}
