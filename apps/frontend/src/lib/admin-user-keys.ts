/**
 * Query keys of the admin user reads that don't come from oRPC's
 * `queryOptions` (Better Auth's admin client, the debounced user search).
 * They all sit under `all()`, the prefix every admin user mutation
 * invalidates, so a role change, ban or new user reaches each of them.
 */
export const adminUserKeys = {
  all: () => ["admin", "users"] as const,
  byId: (id: string | null) => [...adminUserKeys.all(), "byId", id] as const,
  byIds: (ids: readonly string[]) =>
    [...adminUserKeys.all(), "byIds", ids] as const,
  search: () => [...adminUserKeys.all(), "search"] as const,
  stats: () => [...adminUserKeys.all(), "stats"] as const,
}
