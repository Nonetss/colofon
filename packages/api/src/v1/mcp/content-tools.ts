import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import type { AppRouterClient } from "#router"
import { contentInput } from "#v1/content/input"

// The MCP's content tools, for admins only: the backend passes the client
// below only when the caller is an admin, and the server registers them only
// then. `sync` goes through `v1.content.syncRepository` as the caller, like
// the admin page's "Sincronizar", so the procedure's own admin check applies.

/** The `v1.content` procedures the content tools call. */
export type ContentClient = Pick<
  AppRouterClient["v1"]["content"],
  "syncRepository"
>

export type ContentToolScope = {
  content: ContentClient
  origin: string
}

export const syncInput = z.object({
  repository: contentInput.syncRepository.shape.slug,
})

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] }
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true }
}

/** `sync`: fetch one repository now and check out its ref. */
export async function syncTool({
  content,
  origin,
  input,
}: ContentToolScope & {
  input: z.infer<typeof syncInput>
}): Promise<CallToolResult> {
  try {
    const synced = await content.syncRepository({ slug: input.repository })
    const lines = [
      `Synced ${synced.name} (${synced.slug}) at ${synced.ref}.`,
      `- Commit: ${synced.lastCommit}`,
      `- Synced at: ${synced.lastSyncedAt}`,
      `- Read it at ${origin}/${synced.slug}`,
    ]
    return textResult(lines.join("\n"))
  } catch (error) {
    if (!(error instanceof ORPCError)) throw error
    if (error.code === "NOT_FOUND") {
      return errorResult(
        `No repository "${input.repository}". Call repositories to list the valid slugs.`
      )
    }
    if (error.code === "BAD_GATEWAY") {
      return errorResult(
        `Syncing "${input.repository}" failed: ${error.message}`
      )
    }
    throw error
  }
}
