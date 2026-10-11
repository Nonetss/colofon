import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { keepConnected } from "@/lib/event-stream"
import { client, orpc } from "@/lib/orpc"

/**
 * Keeps `/crons` current while it is open: `v1.cron.watchJobs` pushes an event
 * whenever any job runs or is written, and each one refetches the list.
 * Nothing polls. `subscribed` arrives on every (re)connection and events are
 * not replayed, so it refetches too, covering what changed while the stream
 * was down. A dropped stream reconnects with backoff.
 */
export function useCronJobEvents() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    // A session that is gone ends the loop: nothing left to watch.
    void keepConnected(signal, async (connected) => {
      const events = await client.v1.cron.watchJobs(undefined, {
        signal,
        context: { read: true },
      })
      for await (const event of events) {
        if (event.type === "subscribed") connected()
        void queryClient.invalidateQueries({
          queryKey: orpc.v1.cron.list.queryKey(),
        })
      }
      // The backend ended the stream (shutdown): reopen it.
      return "reconnect"
    }).catch(() => {})

    return () => controller.abort()
  }, [queryClient])
}
