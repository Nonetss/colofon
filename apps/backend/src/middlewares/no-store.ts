import { SCHEMAS_PATH } from "@nonete/api/server"
import { createMiddleware } from "hono/factory"

/**
 * Marks the content schema endpoints uncacheable, so the editor sees a new
 * type, entity or page on its next fetch instead of a stored copy.
 */
export const noStoreContentSchemas = createMiddleware(async (c, next) => {
  await next()
  if (c.req.path.startsWith(SCHEMAS_PATH)) {
    c.header("Cache-Control", "no-store")
  }
})
