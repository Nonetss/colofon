/**
 * The options of the ref select: the remote's branches, plus the current
 * ref when it is not one of them (a tag or a commit typed before).
 */
export function refOptions(branches: string[], current: string): string[] {
  if (current === "" || branches.includes(current)) return branches
  return [current, ...branches]
}

/**
 * The branch to preselect: the one the remote's HEAD points at, or the first
 * branch when HEAD points at none; `undefined` without branches.
 */
export function suggestedBranch(listing: {
  branches: string[]
  defaultBranch: string | null
}): string | undefined {
  if (listing.defaultBranch !== null) return listing.defaultBranch
  return listing.branches[0]
}
