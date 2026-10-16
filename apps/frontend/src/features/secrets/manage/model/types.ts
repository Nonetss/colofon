import type { AppRouterClient } from "@nonete/api/router"

type SecretClient = AppRouterClient["v1"]["secret"]

export type SecretList = Awaited<ReturnType<SecretClient["list"]>>

export type SecretListItem = SecretList["secrets"][number]

export type SecretCreateInput = Parameters<SecretClient["create"]>[0]

export type SecretUpdateInput = Parameters<SecretClient["update"]>[0]

export type SecretUsageEntry = Awaited<
  ReturnType<SecretClient["usage"]>
>["entries"][number]
