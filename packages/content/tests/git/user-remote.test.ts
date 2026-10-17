import { describe, expect, test } from "bun:test"
import {
  checkUserRemote,
  isInternalAddress,
  parseTrustedHosts,
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

describe("parseTrustedHosts", () => {
  test("trims, lower-cases and drops blanks", () => {
    expect([...parseTrustedHosts(" Git.Casa.lan , gitea.lan,")]).toEqual([
      "git.casa.lan",
      "gitea.lan",
    ])
  })

  test("nothing is trusted when unset or empty", () => {
    expect(parseTrustedHosts(undefined).size).toBe(0)
    expect(parseTrustedHosts("").size).toBe(0)
  })
})

describe("trusted hosts", () => {
  const trusted = parseTrustedHosts("git.noneweb.online,10.1.1.10")
  const internal = async () => ["10.1.1.10"]

  test("a listed name that resolves to a private address is accepted", async () => {
    const result = await checkUserRemote(
      "https://git.noneweb.online/nonete/homelab",
      internal,
      trusted
    )
    expect(result).toEqual({ ok: true })
  })

  test("an unlisted name that resolves to a private address is refused, with advice and no address", async () => {
    const result = await checkUserRemote(
      "https://git.otro.lan/x.git",
      internal,
      trusted
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("TRUSTED_GIT_HOSTS")
      expect(result.error).not.toContain("10.1.1.10")
    }
  })

  test("without a trusted list nothing changes", async () => {
    const result = await checkUserRemote(
      "https://git.noneweb.online/nonete/homelab",
      internal
    )
    expect(result.ok).toBe(false)
  })

  test("a listed IP literal passes the text check, an unlisted one does not", () => {
    expect(
      userRemoteProblem("https://10.1.1.10/x.git", trusted)
    ).toBeUndefined()
    expect(userRemoteProblem("https://10.1.1.11/x.git", trusted)).toBeString()
  })

  test("plain http is refused even on a listed host", () => {
    expect(
      userRemoteProblem("http://git.noneweb.online/x.git", trusted)
    ).toBeString()
  })
})
