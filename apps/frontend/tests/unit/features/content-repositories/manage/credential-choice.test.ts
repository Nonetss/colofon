import { describe, expect, test } from "bun:test"
import {
  choiceOfValue,
  choiceValue,
  credentialsForUrl,
  defaultChoice,
  type GitCredential,
  hostOfServer,
  hostOfUrl,
  readCredentialId,
} from "@/features/content-repositories/manage/model/credential-choice"

function credential(overrides: Partial<GitCredential>): GitCredential {
  return {
    id: "c1",
    host: "git.example.com",
    username: "ana",
    inUse: false,
    unreadable: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

const older = credential({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" })
const newer = credential({
  id: "new",
  username: "bea",
  updatedAt: "2026-02-01T00:00:00.000Z",
})
const other = credential({ id: "other", host: "git.other.org" })

describe("hostOfUrl", () => {
  test("is the host with its port, or nothing for half a URL", () => {
    expect(hostOfUrl("https://git.example.com:8443/org/docs")).toBe(
      "git.example.com:8443"
    )
    expect(hostOfUrl("https://***@git.example.com/org/docs.git")).toBe(
      "git.example.com"
    )
    expect(hostOfUrl("git.example")).toBe(undefined)
    expect(hostOfUrl("")).toBe(undefined)
  })
})

describe("credentialsForUrl", () => {
  test("keeps the credentials of the URL's host, latest first", () => {
    expect(
      credentialsForUrl(
        [older, other, newer],
        "https://git.example.com/a/b"
      ).map((each) => each.id)
    ).toEqual(["new", "old"])
  })

  test("offers none while the URL isn't complete", () => {
    expect(credentialsForUrl([older], "https://")).toEqual([])
  })
})

describe("defaultChoice", () => {
  test("keeps the credential the repository uses while it matches", () => {
    expect(defaultChoice([newer, older], "old")).toEqual({
      kind: "saved",
      id: "old",
    })
  })

  test("preselects the latest one for the host", () => {
    expect(defaultChoice([newer, older], null)).toEqual({
      kind: "saved",
      id: "new",
    })
  })

  test("ignores a repository credential that no longer matches the host", () => {
    expect(defaultChoice([], "old")).toEqual({ kind: "none" })
  })

  test("is none without credentials", () => {
    expect(defaultChoice([], null)).toEqual({ kind: "none" })
  })
})

describe("select values", () => {
  test("round-trip none and a credential id", () => {
    for (const choice of [
      { kind: "none" as const },
      { kind: "saved" as const, id: "abc" },
    ]) {
      expect(choiceOfValue(choiceValue(choice))).toEqual(choice)
    }
  })

  test("only a saved choice is sent with a read", () => {
    expect(readCredentialId({ kind: "saved", id: "abc" })).toBe("abc")
    expect(readCredentialId({ kind: "none" })).toBe(undefined)
  })
})

describe("hostOfServer", () => {
  test("takes a bare host or a pasted URL, lowercase", () => {
    expect(hostOfServer(" Git.Example.com ")).toBe("git.example.com")
    expect(hostOfServer("https://Git.Example.com:8443/org/docs")).toBe(
      "git.example.com:8443"
    )
    expect(hostOfServer("https://")).toBe("")
  })
})
