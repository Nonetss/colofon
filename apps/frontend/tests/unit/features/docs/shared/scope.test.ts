import { describe, expect, test } from "bun:test"
import {
  inScope,
  readScopeCookie,
  resolveScope,
  scopeAfterVisit,
  scopeCookie,
  scopeToStore,
} from "@/features/docs/shared/model/scope"

const SLUGS = ["casa", "trabajo"]

describe("resolveScope", () => {
  test("a remembered repository that exists is the scope", () => {
    expect(resolveScope("trabajo", SLUGS)).toEqual({
      kind: "repository",
      slug: "trabajo",
    })
  })

  test("todos, nothing stored or a repository that no longer exists is Todos", () => {
    expect(resolveScope("todos", SLUGS)).toEqual({ kind: "all" })
    expect(resolveScope(undefined, SLUGS)).toEqual({ kind: "all" })
    expect(resolveScope("borrado", SLUGS)).toEqual({ kind: "all" })
  })

  test("with a single repository the scope is that one, whatever is stored", () => {
    expect(resolveScope("todos", ["casa"])).toEqual({
      kind: "repository",
      slug: "casa",
    })
  })

  test("without repositories the scope is Todos", () => {
    expect(resolveScope("casa", [])).toEqual({ kind: "all" })
  })
})

describe("scopeAfterVisit", () => {
  test("opening a page of another repository moves a single scope there", () => {
    expect(
      scopeAfterVisit({ kind: "repository", slug: "casa" }, "trabajo")
    ).toEqual({ kind: "repository", slug: "trabajo" })
  })

  test("Todos stays Todos", () => {
    expect(scopeAfterVisit({ kind: "all" }, "trabajo")).toEqual({
      kind: "all",
    })
  })
})

describe("scopeToStore", () => {
  test("a page of another repository stores that repository", () => {
    expect(scopeToStore("casa", SLUGS, "trabajo")).toBe("trabajo")
  })

  test("nothing is stored when the scope already says so, or stays Todos", () => {
    expect(scopeToStore("casa", SLUGS, "casa")).toBeUndefined()
    expect(scopeToStore("todos", SLUGS, "casa")).toBeUndefined()
  })

  test("a first visit without a cookie stores Todos", () => {
    expect(scopeToStore(undefined, SLUGS, "casa")).toBe("todos")
  })

  test("with a single repository nothing is stored", () => {
    expect(scopeToStore(undefined, ["casa"], "casa")).toBeUndefined()
  })
})

describe("inScope", () => {
  test("Todos shows every repository and a single scope only its own", () => {
    expect(inScope({ kind: "all" }, "casa")).toBe(true)
    expect(inScope({ kind: "repository", slug: "casa" }, "casa")).toBe(true)
    expect(inScope({ kind: "repository", slug: "casa" }, "trabajo")).toBe(false)
  })
})

describe("scope cookie", () => {
  test("a stored scope is read back from a cookie header", () => {
    const stored = scopeCookie({ kind: "repository", slug: "casa" })
    expect(stored).toStartWith("docs_scope=casa;")
    expect(stored).toContain("Path=/")
    expect(stored).toContain("SameSite=Lax")
    expect(readScopeCookie("a=1; docs_scope=casa; b=2")).toBe("casa")
    expect(
      readScopeCookie(scopeCookie({ kind: "all" }).split(";")[0] ?? "")
    ).toBe("todos")
  })

  test("no scope cookie reads as undefined", () => {
    expect(readScopeCookie("a=1")).toBeUndefined()
    expect(readScopeCookie("")).toBeUndefined()
  })
})
