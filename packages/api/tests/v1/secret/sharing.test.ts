import { beforeEach, describe, expect, test } from "bun:test"
import { secretRow } from "@nonete/db/testing"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  assertSharedNameFree,
  sharedAddress,
  sharedSecretsOf,
} from "#v1/secret/sharing"

const equipo = { id: "org-equipo", name: "Equipo docs", slug: "equipo-docs" }

beforeEach(() => {
  fakeDb.reset()
})

describe("sharedSecretsOf", () => {
  test("returns each share with its secret, organization and owner in one query", async () => {
    const komodo = secretRow({ userId: "ana" })
    fakeDb.queue("select", [
      { secret: komodo, organization: equipo, ownerName: "Ana" },
    ])

    expect(await sharedSecretsOf("luis")).toEqual([
      { secret: komodo, organization: equipo, ownerName: "Ana" },
    ])
    expect(fakeDb.calls("select")).toHaveLength(1)
  })

  test("nothing shared is an empty list", async () => {
    fakeDb.queue("select", [])
    expect(await sharedSecretsOf("luis")).toEqual([])
  })
})

describe("sharedAddress", () => {
  test("puts the organization's slug before the name", () => {
    expect(sharedAddress("equipo-docs", "komodo")).toBe("equipo-docs/komodo")
  })
})

describe("assertSharedNameFree", () => {
  test("no organizations reads nothing", async () => {
    await assertSharedNameFree("komodo", [], "secret-1")
    expect(fakeDb.calls()).toEqual([])
  })

  test("a free name passes", async () => {
    fakeDb.queue("select", [])
    await assertSharedNameFree("komodo", [equipo.id], "secret-1")
    expect(fakeDb.calls("select")).toHaveLength(1)
  })

  test("a name another secret shares with the organization is a CONFLICT", async () => {
    fakeDb.queue("select", [{ organizationName: "Equipo docs" }])
    await expectErrorCode(
      assertSharedNameFree("komodo", [equipo.id], "secret-1"),
      "CONFLICT"
    )
  })
})
