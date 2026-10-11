import { closeCronEvents } from "#v1/cron/events"

/**
 * Ends every v1 stream that outlives its request: today the open cron run and
 * job watchers. A feature that adds such a stream registers its closer here.
 */
export function closeStreams(): void {
  closeCronEvents()
}
