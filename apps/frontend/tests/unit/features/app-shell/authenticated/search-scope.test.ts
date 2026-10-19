import { describe, expect, test } from "bun:test"
import {
  scopeSwitchRepository,
  searchRepositoryOf,
} from "@/features/app-shell/authenticated/model/search-scope"
import type { DocsNav } from "@/features/docs/shared"

type Repository = DocsNav["repositories"][number]

function repository(slug: string, name: string, available = true): Repository {
  return {
    slug,
    name,
    title: name,
    description: null,
    available,
    sharedBy: null,
    home: null,
    nodes: [],
  }
}

const repositories = [
  repository("casa", "Casa"),
  repository("trabajo", "Trabajo"),
]

describe("scopeSwitchRepository", () => {
  test("offers the repository the scope names", () => {
    expect(scopeSwitchRepository("casa", repositories)).toEqual({
      slug: "casa",
      name: "Casa",
    })
  })

  test("offers nothing in Todos or for a value naming no repository", () => {
    expect(scopeSwitchRepository("todos", repositories)).toBeNull()
    expect(scopeSwitchRepository("nadie", repositories)).toBeNull()
    expect(scopeSwitchRepository(undefined, repositories)).toBeNull()
  })

  test("offers nothing with a single readable repository", () => {
    expect(
      scopeSwitchRepository("casa", [
        repository("casa", "Casa"),
        repository("vacio", "Vacío", false),
      ])
    ).toBeNull()
  })
})

describe("searchRepositoryOf", () => {
  test("searches the stored repository until the user switches to Todos", () => {
    expect(searchRepositoryOf("casa", false)).toBe("casa")
    expect(searchRepositoryOf("casa", true)).toBeUndefined()
  })

  test("Todos and no cookie search every repository", () => {
    expect(searchRepositoryOf("todos", false)).toBeUndefined()
    expect(searchRepositoryOf(undefined, false)).toBeUndefined()
  })
})
