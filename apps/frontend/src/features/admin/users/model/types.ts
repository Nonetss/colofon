import type { client } from "@/lib/orpc"

/** A user as the administrator list returns it (`v1.adminUser.list`). */
export type UserRow = Awaited<
  ReturnType<typeof client.v1.adminUser.list>
>["users"][number]
