import { beforeEach, describe, expect, test } from "bun:test"
import { fakeDb } from "#tests/fixtures/db"
import {
  reportCronConsistency,
  resolveDeclaredJobsRunAs,
} from "#v1/cron/startup"

beforeEach(() => fakeDb.reset())

describe("resolveDeclaredJobsRunAs", () => {
  test("is nobody without an email, and reads nothing", async () => {
    expect(await resolveDeclaredJobsRunAs(undefined)).toBeNull()
    expect(fakeDb.calls()).toEqual([])
  })

  test("is the user with that email, with their role", async () => {
    fakeDb.queue("query.user.findFirst", { id: "u1", role: "admin" })
    expect(await resolveDeclaredJobsRunAs("admin@example.org")).toEqual({
      userId: "u1",
      role: "admin",
    })
    const [lookup] = fakeDb.calls("query.user.findFirst")
    expect(lookup?.steps[0]?.args[0]).toMatchObject({
      where: { email: "admin@example.org" },
    })
  })

  test("is nobody when no user has that email", async () => {
    fakeDb.queue("query.user.findFirst", undefined)
    expect(await resolveDeclaredJobsRunAs("nadie@example.org")).toBeNull()
  })
})

describe("reportCronConsistency", () => {
  test("checks only the manual jobs, since the sync reconciles declared ones", async () => {
    fakeDb.queue("query.cronJob.findMany", [])
    await reportCronConsistency()
    const [jobs] = fakeDb.calls("query.cronJob.findMany")
    expect(jobs?.steps[0]?.args[0]).toEqual({ where: { source: "manual" } })
  })
})
