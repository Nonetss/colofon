import type { CronRunChange } from "@nonete/cron"
import { MemoryPublisher } from "@orpc/publisher/memory"

type CronEvents = {
  "run-changed": CronRunChange
  /** The job list may differ: a run changed or a job was written. */
  "list-changed": Record<string, never>
}

type CronEventsState = {
  publisher: MemoryPublisher<CronEvents>
  /** Aborted on shutdown so open subscriptions end before the HTTP drain. */
  shutdown: AbortController
}

// `bun --hot` re-evaluates this module but keeps the already started
// scheduler, whose `onRunChange` closure holds the first publisher. Keeping
// the state on globalThis (same realm across reloads) stops the scheduler and
// new subscribers from ending up on different publishers.
declare global {
  var __cronEvents: CronEventsState | undefined
}

function createState(): CronEventsState {
  const existing = globalThis.__cronEvents
  if (existing) return existing
  const created: CronEventsState = {
    // In memory: the scheduler is single-instance, so every run is published
    // by the same process its subscribers are connected to.
    publisher: new MemoryPublisher<CronEvents>(),
    shutdown: new AbortController(),
  }
  globalThis.__cronEvents = created
  return created
}

const state = createState()

/** Wired to the scheduler's `onRunChange` by the backend. */
export async function publishCronRunChange(
  change: CronRunChange
): Promise<void> {
  await state.publisher.publish("run-changed", change)
  // A run moves the job's last and next run, which the list shows.
  await state.publisher.publish("list-changed", {})
}

/**
 * Wired to the cron service's `onChange` by the backend, which every create,
 * update, enable/disable and remove passes through.
 */
export function publishCronJobsChange(): Promise<void> {
  return state.publisher.publish("list-changed", {})
}

/**
 * Signal that ends a subscription when the caller goes away or the backend
 * shuts down, whichever comes first.
 */
export function cronEventsSignal(signal: AbortSignal | undefined) {
  if (!signal) return state.shutdown.signal
  return AbortSignal.any([signal, state.shutdown.signal])
}

/**
 * Every run change of every job, from the moment of the call. The iterator
 * throws the abort reason once `signal` aborts.
 */
export function subscribeCronRunChanges(signal: AbortSignal) {
  return state.publisher.subscribe("run-changed", { signal })
}

/**
 * Every change that may alter the job list, from the moment of the call. The
 * iterator throws the abort reason once `signal` aborts.
 */
export function subscribeCronListChanges(signal: AbortSignal) {
  return state.publisher.subscribe("list-changed", { signal })
}

/** Ends every open subscription. Called by the backend's shutdown. */
export function closeCronEvents(): void {
  state.shutdown.abort()
}
