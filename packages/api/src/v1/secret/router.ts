import { openapi } from "@orpc/openapi"
import {
  cronMeta,
  cronProcedure,
  protectedProcedure,
  sessionProcedure,
} from "#index"
import { secretHandler } from "#v1/secret/handler"
import { secretInput } from "#v1/secret/input"
import { secretOutput } from "#v1/secret/output"

const tags = ["Secrets"]

export const secretRouter = {
  list: protectedProcedure
    .meta(
      openapi({
        summary: "List the caller's secrets",
        description:
          "Returns the caller's secrets in name order with their field names, origins, flags and the organizations each is shared with, and the secrets shared with the caller, never their values. Accepts an API key, so the MCP can show an agent which secrets exist. Without SECRETS_ENCRYPTION_KEY it answers enabled: false and no secrets; the other secret procedures are then SERVICE_UNAVAILABLE.",
        tags,
        method: "GET",
      })
    )
    .output(secretOutput.list)
    .handler(({ context }) => secretHandler.list({ context })),

  create: sessionProcedure
    .meta(
      openapi({
        summary: "Create a secret",
        description:
          "Stores a secret for the caller with its values encrypted. Only from a browser session: a request with an API key is FORBIDDEN. CONFLICT when the caller already has a secret with that name.",
        tags,
        method: "POST",
        successStatus: 201,
      })
    )
    .input(secretInput.create)
    .output(secretOutput.create)
    .handler(({ context, input }) => secretHandler.create({ context, input })),

  update: sessionProcedure
    .meta(
      openapi({
        summary: "Update a secret",
        description:
          "Changes a secret of the caller's; omitted properties keep their value. A field list replaces the fields: a listed field without a value keeps its stored value, a stored field not listed is removed. Only from a browser session.",
        tags,
        method: "PATCH",
      })
    )
    .input(secretInput.update)
    .output(secretOutput.update)
    .handler(({ context, input }) => secretHandler.update({ context, input })),

  delete: sessionProcedure
    .meta(
      openapi({
        summary: "Delete a secret",
        description:
          "Deletes a secret of the caller's. Its usage log entries remain. Only from a browser session.",
        tags,
        method: "DELETE",
      })
    )
    .input(secretInput.delete)
    .output(secretOutput.delete)
    .handler(({ context, input }) => secretHandler.delete({ context, input })),

  share: sessionProcedure
    .meta(
      openapi({
        summary: "Share a secret with organizations",
        description:
          "Replaces the organizations a secret of the caller's is shared with; their members' agents can then use it in the MCP request tool, never seeing its values. Every organization must be one the caller belongs to (NOT_FOUND otherwise). CONFLICT when another secret with that name is already shared with one of them. Only from a browser session.",
        tags,
        method: "PUT",
      })
    )
    .input(secretInput.share)
    .output(secretOutput.share)
    .handler(({ context, input }) => secretHandler.share({ context, input })),

  usage: sessionProcedure
    .meta(
      openapi({
        summary: "List the usage of the caller's secrets",
        description:
          "Returns the caller's calls of the MCP request tool and anyone's calls with a secret the caller owns, with who made each, newest first, optionally only those of one secret. Never holds headers, bodies, query strings or values. Only from a browser session.",
        tags,
        method: "GET",
      })
    )
    .input(secretInput.usage)
    .output(secretOutput.usage)
    .handler(({ context, input }) => secretHandler.usage({ context, input })),

  // The handler key `v1.secret.purgeUsage` is stored in cron_job: never
  // rename it.
  purgeUsage: cronProcedure
    .meta(
      openapi({
        summary: "Purge old secret usage",
        description:
          "Deletes the secret usage entries older than 90 days. Run by the scheduler once a day.",
        tags,
        method: "POST",
      }),
      cronMeta({ schedule: "30 3 * * *", name: "Purgar uso de secretos" })
    )
    .output(secretOutput.purgeUsage)
    .handler(() => secretHandler.purgeUsage()),
}
