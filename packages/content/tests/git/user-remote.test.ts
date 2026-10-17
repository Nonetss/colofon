import { describe, expect, test } from "bun:test"
import {
  checkUserRemote,
  isInternalAddress,
  userRemoteProblem,
} from "#git/user-remote"

describe("isInternalAddress", () => {
  test.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("%s is internal", (address) => {
    expect(isInternalAddress(address)).toBe(true)
  })

  test.each(["8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111"])(
    "%s is public",
    (address) => {
      expect(isInternalAddress(address)).toBe(false)
    }
  )
})

describe("userRemoteProblem", () => {
  test("a public https URL has no problem", () => {
    expect(userRemoteProblem("https://github.com/ana/x.git")).toBeUndefined()
  })

  test.each([
    "http://github.com/ana/x.git",
    "git@github.com:ana/x.git",
    "file:///etc",
    "https://192.168.1.10/x.git",
    "https://127.0.0.1/x.git",
    "https://[::1]/x.git",
    "https://localhost/x.git",
    "https://git.localhost/x.git",
    "https://2130706433/x.git",
  ])("%s is refused", (url) => {
    expect(userRemoteProblem(url)).toBeString()
  })
})

describe("checkUserRemote", () => {
  test("a name that resolves to public addresses passes", async () => {
    const result = await checkUserRemote(
      "https://git.example/x.git",
      async () => ["93.184.216.34"]
    )
    expect(result).toEqual({ ok: true })
  })

  test("a name that resolves to an internal address fails without naming it", async () => {
    const result = await checkUserRemote(
      "https://git.example/x.git",
      async () => ["93.184.216.34", "10.0.0.5"]
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).not.toContain("10.0.0.5")
  })

  test("a name that does not resolve fails", async () => {
    const result = await checkUserRemote(
      "https://git.example/x.git",
      async () => {
        throw new Error("ENOTFOUND")
      }
    )
    expect(result.ok).toBe(false)
  })

  test("an IP literal is not resolved", async () => {
    const result = await checkUserRemote("https://8.8.8.8/x.git", async () => {
      throw new Error("must not resolve")
    })
    expect(result).toEqual({ ok: true })
  })
})
