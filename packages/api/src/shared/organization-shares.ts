import { db } from "@nonete/db"

// What sharing a repository or a secret with organizations has in common:
// which of the picked organizations the owner may share with, and the
// organizations of a resource's shares as the owner sees them.

export type SharedOrganization = { id: string; name: string; slug: string }

/**
 * The organizations among `ids` that `userId` is a member of, once each, as
 * shares to list.
 */
export async function ownersOrganizations(userId: string, ids: string[]) {
  if (ids.length === 0) return []
  const memberships = await db.query.member.findMany({
    where: { userId, organizationId: { in: ids } },
    with: { organization: true },
  })
  const seen = new Set<string>()
  return memberships.filter((membership) => {
    if (seen.has(membership.organizationId)) return false
    seen.add(membership.organizationId)
    return true
  })
}

/** The organizations of `shares`, by name; a dangling one is skipped. */
export function organizationsOf(
  shares: { organization: SharedOrganization | null }[]
): SharedOrganization[] {
  const organizations: SharedOrganization[] = []
  for (const share of shares) {
    if (share.organization === null) continue
    organizations.push({
      id: share.organization.id,
      name: share.organization.name,
      slug: share.organization.slug,
    })
  }
  return organizations.toSorted((a, b) => a.name.localeCompare(b.name, "es"))
}
