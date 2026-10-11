import { skipToken, useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

/** How many of the latest runs the pulse strip summarises. */
export const CRON_RUN_PULSE_WINDOW = 48

/** The pulse's input, or `skipToken` (no request) until there is a job id. */
function pulseInput(jobId: string | null) {
  if (jobId === null) return skipToken
  return { jobId, limit: CRON_RUN_PULSE_WINDOW }
}

/**
 * Latest runs of a job, unfiltered, for the pulse strip. Kept apart from the
 * history list because that one is filtered by status and paged by scroll.
 * It doesn't poll: `useCronRunEvents` refetches it when a run changes.
 */
export const useCronRunPulse = (jobId: string | null) =>
  useQuery(orpc.v1.cron.listRuns.queryOptions({ input: pulseInput(jobId) }))
