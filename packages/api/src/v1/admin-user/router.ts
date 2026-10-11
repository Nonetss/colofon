import { openapi } from "@orpc/openapi"
import { adminProcedure } from "#index"

import { adminUserHandler } from "#v1/admin-user/handler"
import { adminUserInput } from "#v1/admin-user/input"
import { adminUserOutput } from "#v1/admin-user/output"

export const adminUserRouter = {
  list: adminProcedure
    .meta(
      openapi({
        summary: "List users for administration",
        description:
          "Returns an administrator-only, cursor-paginated list of user accounts with their role and ban state, filtered by a name-or-email search, ids, role and ban state and ordered by `sort`/`order` (newest first by default), plus the total the filters keep. Account mutations stay on Better Auth's admin endpoints.",
        tags: ["Admin - Users", "Admin"],
        method: "GET",
      })
    )
    .input(adminUserInput.list)
    .output(adminUserOutput.list)
    .handler(({ context, input }) => adminUserHandler.list({ context, input })),
}
