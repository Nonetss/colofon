// Ranks of a directed graph for the layered forms (flowchart, state,
// swimlane, dependency): each node's rank is its longest distance from a
// source, once the edges that close a cycle are set aside; then each rank
// is ordered by the barycentre of its neighbours to reduce crossings.

export type Link = { from: string; to: string }

export type Ranked = {
  /** Each node's rank, 0 for the sources. */
  rank: Map<string, number>
  /** The indexes of the links that close a cycle (back links). */
  back: Set<number>
  /** Each cycle found, as the ids along it. */
  cycles: string[][]
}

/**
 * Ranks `ids` along `links`, starting from `starts` (or from the nodes no
 * link reaches, or the first node). Links to unknown ids are ignored.
 */
export function rankNodes(
  ids: readonly string[],
  links: readonly Link[],
  starts: readonly string[] = []
): Ranked {
  const known = new Set(ids)
  const out = new Map<string, { to: string; index: number }[]>()
  for (const id of ids) out.set(id, [])
  links.forEach((link, index) => {
    if (!known.has(link.from) || !known.has(link.to)) return
    out.get(link.from)?.push({ to: link.to, index })
  })
  const back = new Set<number>()
  const cycles: string[][] = []
  const state = new Map<string, "open" | "done">()
  const stack: string[] = []
  const visit = (id: string) => {
    state.set(id, "open")
    stack.push(id)
    for (const { to, index } of out.get(id) ?? []) {
      const seen = state.get(to)
      if (seen === "open") {
        back.add(index)
        cycles.push(stack.slice(stack.indexOf(to)))
        continue
      }
      if (seen === undefined) visit(to)
    }
    stack.pop()
    state.set(id, "done")
  }
  for (const id of rootsOf(ids, links, starts, known)) {
    if (!state.has(id)) visit(id)
  }
  for (const id of ids) if (!state.has(id)) visit(id)

  const rank = new Map<string, number>()
  for (const id of ids) rank.set(id, 0)
  // Longest path over the acyclic links, relaxed in topological order.
  for (const id of topological(ids, links, back, known)) {
    const at = rank.get(id) ?? 0
    for (const { to, index } of out.get(id) ?? []) {
      if (back.has(index)) continue
      if ((rank.get(to) ?? 0) < at + 1) rank.set(to, at + 1)
    }
  }
  return { rank, back, cycles }
}

function rootsOf(
  ids: readonly string[],
  links: readonly Link[],
  starts: readonly string[],
  known: ReadonlySet<string>
): string[] {
  const given = starts.filter((id) => known.has(id))
  if (given.length > 0) return given
  const reached = new Set(
    links.filter((link) => link.from !== link.to).map((link) => link.to)
  )
  const sources = ids.filter((id) => !reached.has(id))
  if (sources.length > 0) return sources
  return ids.slice(0, 1)
}

function topological(
  ids: readonly string[],
  links: readonly Link[],
  back: ReadonlySet<number>,
  known: ReadonlySet<string>
): string[] {
  const incoming = new Map<string, number>()
  for (const id of ids) incoming.set(id, 0)
  links.forEach((link, index) => {
    if (back.has(index) || !known.has(link.from) || !known.has(link.to)) return
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + 1)
  })
  const order: string[] = []
  const ready = ids.filter((id) => incoming.get(id) === 0)
  while (ready.length > 0) {
    const id = ready.shift()
    if (id === undefined) break
    order.push(id)
    links.forEach((link, index) => {
      if (back.has(index) || link.from !== id || !known.has(link.to)) return
      const left = (incoming.get(link.to) ?? 0) - 1
      incoming.set(link.to, left)
      if (left === 0) ready.push(link.to)
    })
  }
  return order
}

/**
 * The nodes of each rank, in order: first as written, then moved by the
 * barycentre of their neighbours in the rank above (and below), a few
 * sweeps, which keeps the written order among ties.
 */
export function orderRanks(
  ids: readonly string[],
  rank: ReadonlyMap<string, number>,
  links: readonly Link[]
): string[][] {
  const rows: string[][] = []
  for (const id of ids) {
    const at = rank.get(id) ?? 0
    while (rows.length <= at) rows.push([])
    rows[at]?.push(id)
  }
  const position = new Map<string, number>()
  const place = () =>
    rows.forEach((row) => {
      row.forEach((id, index) => {
        position.set(id, index)
      })
    })
  place()
  const neighbours = (id: string, above: boolean): number[] => {
    const own = rank.get(id) ?? 0
    const found: number[] = []
    for (const link of links) {
      const other = otherEnd(link, id)
      if (other === null) continue
      const otherRank = rank.get(other)
      if (otherRank === undefined) continue
      if (above && otherRank === own - 1) found.push(position.get(other) ?? 0)
      if (!above && otherRank === own + 1) found.push(position.get(other) ?? 0)
    }
    return found
  }
  for (let sweep = 0; sweep < 4; sweep++) {
    const downwards = sweep % 2 === 0
    const order = rows.map((_, index) => index)
    if (!downwards) order.reverse()
    for (const index of order) {
      const row = rows[index]
      if (row === undefined) continue
      const centre = new Map<string, number>()
      for (const id of row) {
        const near = neighbours(id, downwards)
        if (near.length === 0) centre.set(id, position.get(id) ?? 0)
        else centre.set(id, near.reduce((sum, at) => sum + at, 0) / near.length)
      }
      row.sort((a, b) => (centre.get(a) ?? 0) - (centre.get(b) ?? 0))
      place()
    }
  }
  return rows
}

function otherEnd(link: Link, id: string): string | null {
  if (link.from === link.to) return null
  if (link.from === id) return link.to
  if (link.to === id) return link.from
  return null
}
