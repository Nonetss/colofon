import { openapi } from "@orpc/openapi"
import { sessionProcedure } from "#index"
import { gitCredentialHandler } from "#v1/git-credential/handler"
import { gitCredentialInput } from "#v1/git-credential/input"
import { gitCredentialOutput } from "#v1/git-credential/output"

const tags = ["Git credentials"]

export const gitCredentialRouter = {
  list: sessionProcedure
    .meta(
      openapi({
        summary: "List the caller's git credentials",
        description:
          "Returns the caller's saved git logins by host and username, never their tokens, and whether a repository uses each. Without SECRETS_ENCRYPTION_KEY it answers enabled: false and none; saving is then SERVICE_UNAVAILABLE. Only from a browser session.",
        tags,
        method: "GET",
      })
    )
    .output(gitCredentialOutput.list)
    .handler(({ context }) => gitCredentialHandler.list({ context })),

  save: sessionProcedure
    .meta(
      openapi({
        summary: "Save a git credential",
        description:
          "Stores the caller's username and token for a git server, encrypted. Saving again for the same host and username replaces the token, which every repository that uses it picks up on its next sync. Only from a browser session.",
        tags,
        method: "PUT",
      })
    )
    .input(gitCredentialInput.save)
    .output(gitCredentialOutput.save)
    .handler(({ context, input }) =>
      gitCredentialHandler.save({ context, input })
    ),

  delete: sessionProcedure
    .meta(
      openapi({
        summary: "Delete a git credential",
        description:
          "Deletes a credential of the caller's. CONFLICT while a repository uses it. Only from a browser session.",
        tags,
        method: "DELETE",
      })
    )
    .input(gitCredentialInput.delete)
    .output(gitCredentialOutput.delete)
    .handler(({ context, input }) =>
      gitCredentialHandler.delete({ context, input })
    ),
}
