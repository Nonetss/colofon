import type { RoleName } from "@nonete/auth/permissions"
import { z } from "zod"

// What the admin and the members' organization features share: the slug
// rules, how long an invitation lasts and the built-in role names.

/** An organization slug: lowercase letters, digits and hyphens. */
export function organizationSlug() {
  return z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones")
}

/** How long an invitation stays acceptable. */
export const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7

/** The built-in organization roles, from most to least powerful. */
export const ROLE_NAMES = [
  "owner",
  "admin",
  "member",
] as const satisfies readonly RoleName[]
