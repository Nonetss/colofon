import {
  bindCronService,
  isCronHandlerKey,
  publishCronJobsChange,
  publishCronRunChange,
  reportCronConsistency,
  runCronProcedure,
  syncCodeDeclaredJobs,
} from "@nonete/api/server"
import {
  createCronService,
  createScheduler,
  recoverOrphanedRuns,
} from "@nonete/cron"
import { db } from "@nonete/db"
import { logger } from "@nonete/logger"

// The cron scheduler and service of this backend: created on the API's
// procedures and started at boot. What a run does and what the startup
// checks live in `packages/api` (`v1/cron/startup.ts`).

export const cronScheduler = createScheduler({
  db,
  resolve: runCronProcedure,
  logger,
  // Feeds `v1.cron.watchRuns`, which keeps open cron detail pages current.
  onRunChange: publishCronRunChange,
})

export const cronService = createCronService({
  db,
  // Every job write passes through here: reschedule, and tell open `/crons`
  // lists (`v1.cron.watchJobs`) to refetch.
  onChange: async () => {
    await cronScheduler.refresh()
    await publishCronJobsChange()
  },
  isValidHandlerKey: isCronHandlerKey,
  triggerRun: (id) => cronScheduler.runNow(id),
})

bindCronService(cronService)

export async function startCron(): Promise<void> {
  await recoverOrphanedRuns(db, logger)
  await syncCodeDeclaredJobs()
  await reportCronConsistency()
  await cronScheduler.start()
}
