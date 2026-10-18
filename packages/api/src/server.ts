// What the backend mounts and starts, so it imports this package only through
// its root modules (`context`, `router`, `lifecycle` and this one) and never
// reaches into a feature: the hosted repositories' git endpoint, the editor
// schema path, the documentation MCP and its request executor, the first
// content sync, and the cron procedures and events the scheduler runs.

export { SCHEMAS_PATH } from "#v1/content/handler"
export { gitHttp, startContentSync } from "#v1/content/runtime"
export { isCronHandlerKey } from "#v1/cron/discovery"
export { publishCronJobsChange, publishCronRunChange } from "#v1/cron/events"
export { bindCronService } from "#v1/cron/runtime"
export {
  reportCronConsistency,
  runCronProcedure,
  syncCodeDeclaredJobs,
} from "#v1/cron/startup"
export { serveMcp } from "#v1/mcp/http"
export { executeRequest } from "#v1/secret/request/execute"
