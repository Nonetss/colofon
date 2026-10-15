import type { AppRouterClient } from "@nonete/api/router"

export type HostedRepository = Awaited<
  ReturnType<AppRouterClient["v1"]["content"]["listRepositories"]>
>[number]
