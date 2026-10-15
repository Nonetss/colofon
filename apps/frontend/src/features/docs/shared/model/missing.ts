import { ORPCError } from "@orpc/client"

/**
 * Whether a reader call failed because there is no such page or repository
 * (or the path can't be one), which the routes answer with a 404.
 */
export function isMissing(error: unknown): boolean {
  if (!(error instanceof ORPCError)) return false
  return error.code === "NOT_FOUND" || error.code === "BAD_REQUEST"
}
