import { describe, expect, test } from "bun:test"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { isReservedSlug, RESERVED_SLUGS } from "#contract/reserved-slugs"

// Reads the frontend's routes and the gateway's config from the repository,
// so adding a top-level page or a backend path without reserving it fails
// here instead of silently hiding a content repository.

const REPO = path.resolve(import.meta.dir, "../../../..")

/** A name that could also be a slug: lowercase, digits and hyphens. */
const SLUG_LIKE = /^[a-z0-9]+(-[a-z0-9]+)*$/

async function frontendTopLevelNames(): Promise<string[]> {
  const pages = await readdir(path.join(REPO, "apps/frontend/src/pages"))
  const publicEntries = await readdir(path.join(REPO, "apps/frontend/public"))
  const names = [
    ...pages.map((name) => name.replace(/\.(astro|ts)$/, "")),
    ...publicEntries,
  ]
  return names.filter((name) => name !== "index" && SLUG_LIKE.test(name))
}

async function gatewayPaths(): Promise<string[]> {
  const caddy = await readFile(
    path.join(REPO, "apps/gateway/routes.caddy"),
    "utf8"
  )
  const segments = [
    ...caddy.matchAll(/(?:^|\s)\/([a-z0-9-]+)(?=[/*\s]|$)/gm),
  ].map((match) => match[1] ?? "")
  return segments.filter((name) => SLUG_LIKE.test(name))
}

describe("RESERVED_SLUGS", () => {
  test("every top-level frontend page and public folder is reserved", async () => {
    for (const name of await frontendTopLevelNames()) {
      expect({ name, reserved: isReservedSlug(name) }).toEqual({
        name,
        reserved: true,
      })
    }
  })

  test("every path the gateway answers or sends to the backend is reserved", async () => {
    const names = await gatewayPaths()
    expect(names).toContain("rpc")
    for (const name of names) {
      expect({ name, reserved: isReservedSlug(name) }).toEqual({
        name,
        reserved: true,
      })
    }
  })

  test("the list holds only slug-shaped names", () => {
    for (const slug of RESERVED_SLUGS) expect(slug).toMatch(SLUG_LIKE)
  })
})
