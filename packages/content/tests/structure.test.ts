import { describe, expect, test } from "bun:test"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

// Reads the real `src/` tree (`content-package-structure`): every module
// lives in an area folder, areas import each other in one direction only,
// and no import cycle exists, type-only imports included.

const SRC = path.resolve(import.meta.dir, "../src")

/** Each area and the other areas it may import from. */
const ALLOWED: Record<string, readonly string[]> = {
  contract: [],
  git: ["contract"],
  diagrams: ["contract"],
  pages: ["contract", "diagrams"],
  editor: ["contract", "diagrams"],
}

const BARREL = "index"

/** Module ids (`src/`-relative, no `.ts`) to the module ids they import. */
async function importGraph(): Promise<Map<string, string[]>> {
  const graph = new Map<string, string[]>()
  const entries = await readdir(SRC, { recursive: true, withFileTypes: true })
  const files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".ts")
  )
  for (const entry of files) {
    const file = path.join(entry.parentPath, entry.name)
    const id = path.relative(SRC, file).replace(/\.ts$/, "")
    const source = await readFile(file, "utf8")
    const specifiers = [
      ...source.matchAll(/(?:from|import\()\s*"#([^"]+)"/g),
    ].map((match) => match[1] ?? "")
    graph.set(id, [...new Set(specifiers)])
  }
  return graph
}

function areaOf(id: string): string {
  return id.split("/")[0] ?? ""
}

/** The groups of modules that import each other in a ring (Tarjan). */
function cyclesOf(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  const order = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const cycles: string[][] = []

  const visit = (id: string) => {
    order.set(id, order.size)
    low.set(id, order.size - 1)
    stack.push(id)
    onStack.add(id)
    for (const next of graph.get(id) ?? []) {
      if (!graph.has(next)) continue
      if (!order.has(next)) {
        visit(next)
        low.set(id, Math.min(low.get(id) ?? 0, low.get(next) ?? 0))
      } else if (onStack.has(next)) {
        low.set(id, Math.min(low.get(id) ?? 0, order.get(next) ?? 0))
      }
    }
    if (low.get(id) !== order.get(id)) return
    const ring: string[] = []
    for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
      onStack.delete(member)
      ring.push(member)
      if (member === id) break
    }
    const selfImport = graph.get(id)?.includes(id) === true
    if (ring.length > 1 || selfImport) cycles.push(ring.sort())
  }

  for (const id of graph.keys()) if (!order.has(id)) visit(id)
  return cycles
}

describe("packages/content structure", () => {
  test("the source root holds only the barrel and the area folders", async () => {
    const names = (await readdir(SRC)).sort()
    expect(names).toEqual([...Object.keys(ALLOWED), `${BARREL}.ts`].sort())
  })

  test("areas import each other only in the allowed direction", async () => {
    const graph = await importGraph()
    const forbidden: string[] = []
    for (const [id, imports] of graph) {
      if (id === BARREL) continue
      const area = areaOf(id)
      const allowed = ALLOWED[area] ?? []
      for (const target of imports) {
        const targetArea = areaOf(target)
        if (targetArea === area || allowed.includes(targetArea)) continue
        forbidden.push(`${id} → #${target}`)
      }
    }
    expect(forbidden).toEqual([])
  })

  test("no module imports itself back through others", async () => {
    expect(cyclesOf(await importGraph())).toEqual([])
  })
})
