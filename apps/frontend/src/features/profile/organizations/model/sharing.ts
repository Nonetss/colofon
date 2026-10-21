// What the forms that share something with organizations (a repository, a
// secret) have in common.

/** Whether two picks of organizations hold the same ones, in any order. */
export function sameOrganizations(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const kept = new Set(a)
  return b.every((id) => kept.has(id))
}
