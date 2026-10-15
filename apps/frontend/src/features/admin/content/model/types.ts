import type { AppRouterClient } from "@nonete/api/router"

export type ContentRepository = Awaited<
  ReturnType<AppRouterClient["v1"]["content"]["listRepositories"]>
>[number]
