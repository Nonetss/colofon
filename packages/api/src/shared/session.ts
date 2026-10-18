import type { Context } from "#context"
import { errors } from "#errors"

// The signed-in user a procedure acts for. The procedure builders already
// keep anonymous callers out; this narrows the context for the handler.

/** The caller's user id; `UNAUTHORIZED` without a signed-in user. */
export function requireUserId(context: Context): string {
  if (context.user === null) throw errors.UNAUTHORIZED()
  return context.user.id
}
