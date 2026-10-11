import { beforeEach, describe, expect, test } from "bun:test"
import {
  type FakeDbCall,
  sessionRow,
  stepArgs,
  userRow,
} from "@nonete/db/testing"
import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"

import { sortedCursor } from "#shared/pagination"
import { adminContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { sessionHistoryHandler } from "#v1/session-history/handler"
import { sessionHistoryInput } from "#v1/session-history/input"

const context = adminContext()
const dialect = new PgDialect()

/** The list's default ordering: newest first. */
const NEWEST_FIRST = { sort: "createdAt", order: "desc" } as const

function sessionWithUser(id: string, sortValue: string) {
  const user = userRow()
  return {
    session: sessionRow({ id }),
    user: { id: user.id, name: user.name, email: user.email, image: null },
    sortValue,
  }
}

/** The page of sessions, then the total, as `list` awaits them. */
function queuePage(rows: unknown[], total: number) {
  fakeDb.queue("select", rows)
  fakeDb.queue("select", [{ total }])
}

function isSql(value: unknown): value is SQL {
  return typeof value === "object" && value !== null && "queryChunks" in value
}

function render(fragment: unknown) {
  if (!isSql(fragment)) throw new Error("not an SQL fragment")
  return dialect.sqlToQuery(fragment).sql
}

function pageQuery(): FakeDbCall {
  const [call] = fakeDb.calls("select")
  if (!call) throw new Error("list made no query")
  return call
}

beforeEach(() => fakeDb.reset())

describe("sessionHistory.list", () => {
  test("defaults to newest first", () => {
    expect(sessionHistoryInput.list.parse({})).toMatchObject(NEWEST_FIRST)
  })

  test("returns one page and a cursor to its last row when more exist", async () => {
    queuePage(
      [
        sessionWithUser("s3", "2026-01-03 00:00:00"),
        sessionWithUser("s2", "2026-01-02 00:00:00"),
        sessionWithUser("s1", "2026-01-01 00:00:00"),
      ],
      3
    )

    const result = await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 2 },
    })

    expect(result.sessions.map((session) => session.id)).toEqual(["s3", "s2"])
    expect(result.total).toBe(3)
    if (!result.nextCursor) throw new Error("expected a cursor")
    expect(sortedCursor.decode(result.nextCursor)).toEqual({
      k: "createdAt",
      o: "desc",
      p: "2026-01-02 00:00:00",
      t: ["s2"],
    })
  })

  test("has no cursor on the last page", async () => {
    queuePage([sessionWithUser("s1", "2026-01-01 00:00:00")], 1)

    const result = await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 2 },
    })

    expect(result.nextCursor).toBeNull()
  })

  test("maps a session and its user without the token", async () => {
    queuePage([sessionWithUser("s1", "2026-01-01 00:00:00")], 1)

    const result = await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25 },
    })

    expect(result.sessions[0]).toMatchObject({
      id: "s1",
      userId: "user-1",
      user: { id: "user-1", name: "Ada Lovelace", email: "ada@example.com" },
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    expect(result.sessions[0]).not.toHaveProperty("token")
  })

  test("skips sessions whose user is gone", async () => {
    queuePage(
      [
        { session: sessionRow({ id: "orphan" }), user: null, sortValue: "x" },
        sessionWithUser("s1", "2026-01-01 00:00:00"),
      ],
      2
    )

    const result = await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25 },
    })

    expect(result.sessions.map((session) => session.id)).toEqual(["s1"])
  })

  test.each([
    ["createdAt", '"session"."created_at"'],
    ["expiresAt", '"session"."expires_at"'],
    ["ipAddress", '"session"."ip_address"'],
    ["user", '"user"."name"'],
  ] as const)(
    "sort %s orders by its column, then the session id",
    async (sort, column) => {
      queuePage([], 0)

      await sessionHistoryHandler.list({
        context,
        input: { sort, order: "asc", limit: 25 },
      })

      expect(stepArgs(pageQuery(), "orderBy").map(render)).toEqual([
        `${column} asc nulls last`,
        '"session"."id" asc',
      ])
    }
  )

  test("a chosen ordering puts its value and direction in the cursor", async () => {
    queuePage(
      [sessionWithUser("s1", "10.0.0.9"), sessionWithUser("s2", "10.0.0.1")],
      2
    )

    const result = await sessionHistoryHandler.list({
      context,
      input: { sort: "ipAddress", order: "desc", limit: 1 },
    })

    if (!result.nextCursor) throw new Error("expected a cursor")
    expect(sortedCursor.decode(result.nextCursor)).toEqual({
      k: "ipAddress",
      o: "desc",
      p: "10.0.0.9",
      t: ["s1"],
    })
  })

  test("a later page reads after the cursor", async () => {
    queuePage([], 0)
    const cursor = sortedCursor.decode(
      sortedCursor.encode({ k: "user", o: "asc", p: "Ada", t: ["s1"] })
    )

    await sessionHistoryHandler.list({
      context,
      input: { sort: "user", order: "asc", limit: 25, cursor },
    })

    expect(render(stepArgs(pageQuery(), "where")[0])).toContain(
      '"user"."name" > $'
    )
  })

  test("a cursor from another ordering is BAD_REQUEST and nothing is read", async () => {
    const cursor = { k: "createdAt", o: "desc" as const, p: "x", t: ["s1"] }

    await expectErrorCode(
      sessionHistoryHandler.list({
        context,
        input: { sort: "expiresAt", order: "desc", limit: 25, cursor },
      }),
      "BAD_REQUEST"
    )
    await expectErrorCode(
      sessionHistoryHandler.list({
        context,
        input: { sort: "createdAt", order: "asc", limit: 25, cursor },
      }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("orders by status, sessions still valid first when ascending", async () => {
    queuePage([], 0)

    await sessionHistoryHandler.list({
      context,
      input: { sort: "status", order: "asc", limit: 25 },
    })

    const [primary] = stepArgs(pageQuery(), "orderBy")
    expect(render(primary)).toContain('"session"."expires_at" > now()')
    expect(render(primary)).toContain("asc nulls last")
  })

  test("a single status keeps only valid or expired sessions, in the page and the total", async () => {
    queuePage([], 0)

    await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25, statuses: ["expired"] },
    })

    const [page, total] = fakeDb.calls("select")
    if (!page || !total) throw new Error("expected the page and the total")
    expect(render(stepArgs(page, "where")[0])).toContain(
      '"session"."expires_at" <= now()'
    )
    expect(render(stepArgs(total, "where")[0])).toContain(
      '"session"."expires_at" <= now()'
    )
  })

  test("both statuses filter nothing", async () => {
    queuePage([], 0)

    await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25, statuses: ["active", "expired"] },
    })

    const [where] = stepArgs(pageQuery(), "where")
    expect(where).toBeUndefined()
  })

  test("keeps only the chosen users' sessions", async () => {
    queuePage([], 0)

    await sessionHistoryHandler.list({
      context,
      input: { ...NEWEST_FIRST, limit: 25, userIds: ["u1", "u2"] },
    })

    expect(render(stepArgs(pageQuery(), "where")[0])).toContain(
      '"session"."user_id" in ($'
    )
  })
})
