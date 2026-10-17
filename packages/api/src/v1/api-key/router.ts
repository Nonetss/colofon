import { openapi } from "@orpc/openapi"
import { protectedProcedure } from "#index"
import { apiKeyHandler } from "#v1/api-key/handler"
import { apiKeyInput } from "#v1/api-key/input"
import { apiKeyOutput } from "#v1/api-key/output"

export const apiKeyRouter = {
  create: protectedProcedure
    .meta(
      openapi({
        summary: "Create an API key",
        description:
          "Creates a new API key for the authenticated user, with the same access as the user (for an agent reading the documentation's llms.txt and llm.txt routes). The plaintext key is returned exactly once in the response, alongside the key's metadata; store it immediately because it cannot be retrieved later.",
        tags: ["API Keys"],
        method: "POST",
        successStatus: 201,
      })
    )
    .input(apiKeyInput.create)
    .output(apiKeyOutput.create)
    .handler(({ context, input }) => {
      return apiKeyHandler.create({ context, input })
    }),

  list: protectedProcedure
    .meta(
      openapi({
        summary: "List API keys",
        description: "Lists the API keys owned by the authenticated user.",
        tags: ["API Keys"],
        method: "GET",
      })
    )
    .output(apiKeyOutput.list)
    .handler(({ context }) => {
      return apiKeyHandler.list({ context })
    }),

  update: protectedProcedure
    .meta(
      openapi({
        summary: "Rename an API key",
        description:
          "Renames an API key owned by the authenticated user. The key itself and its expiry are unchanged.",
        tags: ["API Keys"],
        method: "PATCH",
      })
    )
    .input(apiKeyInput.update)
    .output(apiKeyOutput.update)
    .handler(({ context, input }) => {
      return apiKeyHandler.update({ context, input })
    }),

  delete: protectedProcedure
    .meta(
      openapi({
        summary: "Delete an API key",
        description: "Deletes an API key owned by the authenticated user.",
        tags: ["API Keys"],
        method: "DELETE",
      })
    )
    .input(apiKeyInput.delete)
    .output(apiKeyOutput.delete)
    .handler(({ context, input }) => {
      return apiKeyHandler.delete({ context, input })
    }),

  search: protectedProcedure
    .meta(
      openapi({
        summary: "Search API keys",
        description:
          "Type-ahead search over the authenticated user's own API keys by name, for suggestion-style pickers. Returns a small, unpaginated list.",
        tags: ["API Keys"],
        method: "GET",
      })
    )
    .input(apiKeyInput.search)
    .output(apiKeyOutput.search)
    .handler(({ context, input }) => {
      return apiKeyHandler.search({ context, input })
    }),
}
