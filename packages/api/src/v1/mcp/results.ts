import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"

// What a tool answers: a text an agent reads, or the same marked as an error,
// and the read failures a tool answers with a helpful text instead.

export function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] }
}

export function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true }
}

/**
 * Whether a reader call failed because there is no such repository, page or
 * skill, or the route can't name one: the procedures' input checks reject
 * such paths before looking.
 */
export function isMissing(error: unknown): boolean {
  if (!(error instanceof ORPCError)) return false
  return error.code === "NOT_FOUND" || error.code === "BAD_REQUEST"
}
