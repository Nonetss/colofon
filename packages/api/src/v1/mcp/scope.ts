import type { AppRouterClient } from "#router"

// What every documentation tool reads through: the caller's `v1.docs` and
// `v1.skills` clients and the public origin.

/** The `v1.docs` procedures the tools read through, called as the caller. */
export type DocsClient = Pick<
  AppRouterClient["v1"]["docs"],
  "nav" | "page" | "search"
>

/** The `v1.skills` procedures the skills tools read through. */
export type SkillsClient = Pick<
  AppRouterClient["v1"]["skills"],
  "list" | "get" | "file"
>

/** What every tool gets: the caller's client and the public origin. */
export type ToolScope = {
  docs: DocsClient
  skills: SkillsClient
  /** Origin the site is reached at, prefixed to every reader route. */
  origin: string
}
