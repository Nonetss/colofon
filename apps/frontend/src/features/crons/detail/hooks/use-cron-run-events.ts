import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { keepConnected } from "@/lib/event-stream"
import { client, orpc } from "@/lib/orpc"

/**
 * Keeps the job (lastRunAt/nextRunAt), the run pulse and the run history live
 * while the detail page is open: `v1.cron.watchRuns` pushes an event whenever
 * one of the job's runs starts, finishes or is skipped, and each event
 * refetches them. Nothing polls.
 *
 * The stream sends `subscribed` on every (re)connection and events are not
 * replayed, so that one refetches too, covering whatever changed before the
 * subscription opened or while it was down. A dropped stream reconnects with
 * exponential backoff.
 */
export function useCronRunEvents(jobId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.v1.cron.get.queryKey({ input: { id: jobId } }),
      })
      // Partial input: matches the pulse and every filtered history list.
      void queryClient.invalidateQueries({
        queryKey: orpc.v1.cron.listRuns.key({ input: { jobId } }),
      })
    }

    // A job or session that is gone ends the loop: nothing left to watch.
    const listen = () =>
      keepConnected(signal, async (connected) => {
        const events = await client.v1.cron.watchRuns(
          { jobId },
          { signal, context: { read: true } }
        )
        for await (const event of events) {
          if (event.type === "subscribed") connected()
          refresh()
        }
        // The backend ended the stream (shutdown): reopen it.
        return "reconnect"
      }).catch(() => {})

    void listen()
    return () => controller.abort()
  }, [jobId, queryClient])
}
