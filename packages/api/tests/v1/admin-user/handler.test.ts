import { beforeEach, describe, expect, test } from "bun:test"
import { type FakeDbCall, stepArgs, userRow } from "@nonete/db/testing"
import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"

import { sortedCursor } from "#shared/pagination"
import { adminContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { adminUserHandler } from "#v1/admin-user/handler"
import { adminUserInput } from "#v1/admin-user/input"

const context = adminContext()
const dialect = new PgDialect()

/** The list's default ordering: newest first. */
const NEWEST_FIRST = { sort: "createdAt", order: "desc" } as const

/** The page of users, then the total, as `list` awaits them. */
function queuePage(rows: unknown[], total: number) {
  fakeDb.queue("select", rows)
  fakeDb.queue("select", [{ total }])
}

function listed(id: string, sortValue: string) {
  return { user: userRow({ id }), sortValue }
}

function isSql(value: unknown): value is SQL {
  return typeof value === "object" && value !== null && "queryChunks" in value
}

function render(fragment: unknown) {
  if (!isSql(fragment)) throw new Error("not an SQL fragment")
  return dialect.sqlToQuery(fragment).sql
}

function queries(): [FakeDbCall, FakeDbCall] {
  const [page, total] = fakeDb.calls("select")
  if (!page || !total) throw new Error("expected the page and the total")
  return [page, total]
}

beforeEach(() => fakeDb.reset())

describe("adminUser.list", () => {
  test("defaults to newest first, 25 per page", () => {
    expect(adminUserInput.list.parse({})).toMatchObject({
      ...NEWEST_FIRST,
      limit: 25,
    })
  })

  test("returns one page, the total and a cursor to its last row", async () => {
    queuePage([listed("u1", "Ana"), listed("u2", "Luis")], 7)

    const result = await adminUserHandler.list({
      context,
      input: { sort: "name", order: "asc", limit: 1 },
    })

    expect(result.users.map((user) => user.id)).toEqual(["u1"])
    expect(result.total).toBe(7)
    if (!result.nextCursor) throw new Error("expected a cursor")
    expect(sortedCursor.decode(result.nextCursor)).toEqual({
      k: "name",
      o: "asc",
      p: "Ana",
      t: ["u1"],
    })
  })

  test("has no cursor on the last page and maps dates and ban state", async () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z")
    queuePage(
      [
        {
          user: userRow({ id: "u1", createdAt, banned: null }),
          sortValue: "x",
        },
      ],
      1
    )

    const result = await adminUserHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25 },
    })

    expect(result.nextCursor).toBeNull()
    expect(result.users[0]).toMatchObject({
      id: "u1",
      banned: false,
      createdAt: "2026-01-02T03:04:05.000Z",
    })
  })

  test("filters by ids, a single role and a single status, in the page and the total", async () => {
    queuePage([], 0)

    await adminUserHandler.list({
      context,
      input: {
        ...NEWEST_FIRST,
        limit: 25,
        ids: ["u1", "u2"],
        roles: ["admin"],
        statuses: ["banned"],
      },
    })

    for (const query of queries()) {
      const where = render(stepArgs(query, "where")[0])
      expect(where).toContain('"user"."id" in ($')
      expect(where).toContain('"user"."role" = $')
      expect(where).toContain('"user"."banned" = $')
    }
  })

  test("both roles and both statuses filter nothing", async () => {
    queuePage([], 0)

    await adminUserHandler.list({
      context,
      input: {
        ...NEWEST_FIRST,
        limit: 25,
        roles: ["admin", "user"],
        statuses: ["active", "banned"],
      },
    })

    const [page, total] = queries()
    expect(stepArgs(page, "where")[0]).toBeUndefined()
    expect(stepArgs(total, "where")[0]).toBeUndefined()
  })

  test("the user role keeps users without a role", async () => {
    queuePage([], 0)

    await adminUserHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25, roles: ["user"] },
    })

    const [page] = queries()
    expect(render(stepArgs(page, "where")[0])).toContain(
      '"user"."role" is null'
    )
  })

  test("a later page reads after the cursor", async () => {
    queuePage([], 0)
    const cursor = sortedCursor.decode(
      sortedCursor.encode({ k: "email", o: "asc", p: "a@b.c", t: ["u1"] })
    )

    await adminUserHandler.list({
      context,
      input: { sort: "email", order: "asc", limit: 25, cursor },
    })

    const [page] = queries()
    expect(render(stepArgs(page, "where")[0])).toContain('"user"."email" > $')
  })

  test("a cursor from another ordering is BAD_REQUEST and nothing is read", async () => {
    const cursor = { k: "createdAt", o: "desc" as const, p: "x", t: ["u1"] }

    await expectErrorCode(
      adminUserHandler.list({
        context,
        input: { sort: "name", order: "desc", limit: 25, cursor },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("a search matches the name or the email, in the page and the total", async () => {
    queuePage([], 0)

    await adminUserHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25, search: "ana" },
    })

    for (const query of queries()) {
      const where = render(stepArgs(query, "where")[0])
      expect(where).toContain('"user"."name" ilike $')
      expect(where).toContain('"user"."email" ilike $')
    }
  })

  test("a search shorter than two characters is rejected", () => {
    expect(adminUserInput.list.safeParse({ search: "a" }).success).toBe(false)
  })
})
