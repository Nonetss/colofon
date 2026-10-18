import { beforeEach, describe, expect, test } from "bun:test"
import {
  RECENT_SURFACES_LIMIT,
  readRecentList,
  recordRecent,
} from "@/lib/recent-surfaces"

const LIST = "doc-pages"

beforeEach(() => {
  localStorage.clear()
})

describe("recent lists", () => {
  test("records newest first and moves a repeated href to the front", () => {
    recordRecent(LIST, "u1", "/a")
    recordRecent(LIST, "u1", "/b")
    expect(recordRecent(LIST, "u1", "/a")).toEqual(["/a", "/b"])
    expect(readRecentList(LIST, "u1")).toEqual(["/a", "/b"])
  })

  test("is bounded by the limit", () => {
    for (let index = 0; index < RECENT_SURFACES_LIMIT + 3; index++) {
      recordRecent(LIST, "u1", `/page-${index}`)
    }
    expect(readRecentList(LIST, "u1")).toHaveLength(RECENT_SURFACES_LIMIT)
  })

  test("is scoped per user", () => {
    recordRecent(LIST, "u1", "/a")
    expect(readRecentList(LIST, "u2")).toEqual([])
  })

  test("keeps each list apart", () => {
    recordRecent(LIST, "u1", "/a")
    recordRecent("other", "u1", "/b")
    expect(readRecentList(LIST, "u1")).toEqual(["/a"])
    expect(readRecentList("other", "u1")).toEqual(["/b"])
  })

  test("degrades to an empty list on malformed storage", () => {
    localStorage.setItem(`recent-surfaces:${LIST}:u1`, "{not json")
    expect(readRecentList(LIST, "u1")).toEqual([])
    localStorage.setItem(`recent-surfaces:${LIST}:u1`, JSON.stringify({ a: 1 }))
    expect(readRecentList(LIST, "u1")).toEqual([])
  })
})
