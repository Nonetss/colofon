import type { AppRouterClient } from "@nonete/api/router"

/** A page as `v1.docs.page` answers it. */
export type DocsPage = Awaited<
  ReturnType<AppRouterClient["v1"]["docs"]["page"]>
>
