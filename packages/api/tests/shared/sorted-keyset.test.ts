import { describe, expect, test } from "bun:test"
import { type SQL, sql } from "drizzle-orm"
import { integer, PgDialect, pgTable, text } from "drizzle-orm/pg-core"
import { cursorFor, sortedKeyset } from "#shared/sorted-keyset"
import { expectErrorCode } from "#tests/fixtures/errors"

const dialect = new PgDialect()

const hosts = pgTable("hosts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  speed: integer("speed"),
})

function render(fragment: SQL | undefined) {
  if (fragment === undefined) throw new Error("no fragment")
  return dialect.sqlToQuery(fragment)
}

function keyset(order: "asc" | "desc") {
  return sortedKeyset({
    primary: hosts.speed,
    order,
    tiebreak: [hosts.name, hosts.id],
  })
}

describe("sortedKeyset", () => {
  test("orders by the key with nulls last, then the ascending tiebreak", () => {
    const { orderBy } = keyset("desc")
    expect(orderBy.map((term) => render(term).sql)).toEqual([
      '"hosts"."speed" desc nulls last',
      '"hosts"."name" asc',
      '"hosts"."id" asc',
    ])
    expect(render(keyset("asc").orderBy[0]).sql).toBe(
      '"hosts"."speed" asc nulls last'
    )
  })

  test("selects the key as text for the next cursor", () => {
    expect(render(keyset("asc").sortValue).sql).toBe('("hosts"."speed")::text')
  })

  test("no cursor means no after term", () => {
    expect(keyset("asc").after(undefined)).toBeUndefined()
    expect(keyset("asc").after(null)).toBeUndefined()
  })

  test("ascending: beyond the value, then the nulls, then ties after the tiebreak", () => {
    const query = render(keyset("asc").after({ p: "100", t: ["sw-1", "h-1"] }))
    expect(query.sql).toBe(
      '(("hosts"."speed" > $1) or ("hosts"."speed" is null) or ((("hosts"."speed" = $2) and (("hosts"."name", "hosts"."id") > ($3, $4)))))'
    )
    expect(query.params).toEqual(["100", "100", "sw-1", "h-1"])
  })

  test("descending flips only the comparison with the value", () => {
    const query = render(keyset("desc").after({ p: "100", t: ["sw-1", "h-1"] }))
    expect(query.sql).toStartWith('(("hosts"."speed" < $1) or')
  })

  test("a cursor on a null key stays among the nulls", () => {
    const query = render(keyset("desc").after({ p: null, t: ["sw-1", "h-1"] }))
    expect(query.sql).toBe(
      '(("hosts"."speed" is null) and (("hosts"."name", "hosts"."id") > ($1, $2)))'
    )
    expect(query.params).toEqual(["sw-1", "h-1"])
  })
})

describe("sortedKeyset with a descending tiebreak", () => {
  const newestFirst = (order: "asc" | "desc") =>
    sortedKeyset({
      primary: hosts.speed,
      order,
      tiebreak: [hosts.name, hosts.id],
      tiebreakOrder: "desc",
    })

  test("orders every tiebreak column descending", () => {
    expect(newestFirst("asc").orderBy.map((term) => render(term).sql)).toEqual([
      '"hosts"."speed" asc nulls last',
      '"hosts"."name" desc',
      '"hosts"."id" desc',
    ])
  })

  test("ties come after the cursor's tuple in descending order", () => {
    const query = render(
      newestFirst("asc").after({ p: "100", t: ["sw-1", "h-1"] })
    )
    expect(query.sql).toBe(
      '(("hosts"."speed" > $1) or ("hosts"."speed" is null) or ((("hosts"."speed" = $2) and (("hosts"."name", "hosts"."id") < ($3, $4)))))'
    )
  })

  test("a null-key cursor keeps the descending tuple", () => {
    const query = render(newestFirst("desc").after({ p: null, t: ["sw", "h"] }))
    expect(query.sql).toBe(
      '(("hosts"."speed" is null) and (("hosts"."name", "hosts"."id") < ($1, $2)))'
    )
  })
})

describe("cursorFor", () => {
  const cursor = { k: "speed", o: "desc" as const, p: "1", t: ["sw", "id"] }

  test("no cursor is the first page", () => {
    expect(cursorFor(undefined, "speed", "desc", 2)).toBeUndefined()
  })

  test("a cursor for the same ordering is returned", () => {
    expect(cursorFor(cursor, "speed", "desc", 2)).toEqual(cursor)
  })

  test("another key, direction or tiebreak size is BAD_REQUEST", async () => {
    for (const [sort, order, size] of [
      ["name", "desc", 2],
      ["speed", "asc", 2],
      ["speed", "desc", 3],
    ] as const) {
      await expectErrorCode(
        Promise.resolve().then(() => cursorFor(cursor, sort, order, size)),
        "BAD_REQUEST"
      )
    }
  })
})

test("params bind untyped so Postgres reads them as the compared type", () => {
  const query = render(sql`${hosts.speed} > ${"1000000000"}`)
  expect(query.params).toEqual(["1000000000"])
})
