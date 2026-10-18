import { closeCronEvents } from "#v1/cron/events"
import { closeMcp } from "#v1/mcp/http"

/**
 * Ends every v1 stream that outlives its request: the open cron run and job
 * watchers, and the MCP exchanges still answering. A feature that adds such a
 * stream registers its closer here.
 */
export async function closeStreams(): Promise<void> {
  closeCronEvents()
  await closeMcp()
}
