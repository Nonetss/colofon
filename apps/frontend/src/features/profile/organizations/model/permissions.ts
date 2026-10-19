import type { OrganizationRole } from "@/features/profile/organizations/model/types"

// What the viewer's role lets them do in an organization, as the backend
// allows it: the screen hides what would only answer FORBIDDEN.

/** Owners and admins invite, cancel invitations, change roles and remove. */
export function canManageMembers(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin"
}

/** Only owners rename or delete the organization. */
export function canEditOrganization(role: OrganizationRole): boolean {
  return role === "owner"
}

/** The roles `role` may give, by invitation or by changing a member's. */
export function assignableRoles(role: OrganizationRole): OrganizationRole[] {
  if (role === "owner") return ["owner", "admin", "member"]
  if (role === "admin") return ["admin", "member"]
  return []
}

/** Whether `role` may change or remove a member whose role is `target`. */
export function canEditMember(
  role: OrganizationRole,
  target: OrganizationRole
): boolean {
  if (!canManageMembers(role)) return false
  return target !== "owner" || role === "owner"
}
