import { openapi } from "@orpc/openapi"
import { adminProcedure } from "#index"

import { tracesHandler } from "#v1/traces/handler"
import { tracesInput } from "#v1/traces/input"
import { tracesOutput } from "#v1/traces/output"

export const tracesRouter = {
  search: adminProcedure
    .meta(
      openapi({
        summary: "Search traces",
        description:
          "Returns an administrator-only list of the most recent traces stored in Tempo, newest first, filtered by root service, error status, minimum duration, root span name and time range (default: the last 24 hours). Tempo's search can't paginate, so the list is capped by `limit` and `limitReached` says when older matches may be left out; narrow the time range or filters to see them. Empty when the trace store isn't configured.",
        tags: ["Admin - Traces", "Admin"],
        method: "GET",
      })
    )
    .input(tracesInput.search)
    .output(tracesOutput.search)
    .handler(({ input }) => tracesHandler.search({ input })),

  get: adminProcedure
    .meta(
      openapi({
        summary: "Get a trace",
        description:
          "Returns one trace's spans, administrator-only, already laid out for a waterfall: depth-first with siblings by start time, each with its depth, offset from the trace start and duration. Large traces are cut at a fixed number of spans and flagged as truncated. Fails with NOT_FOUND for an unknown trace and SERVICE_UNAVAILABLE when the trace store isn't configured.",
        tags: ["Admin - Traces", "Admin"],
        method: "GET",
      })
    )
    .input(tracesInput.get)
    .output(tracesOutput.get)
    .handler(({ input }) => tracesHandler.get({ input })),
}
