import { describe, expect, test } from "bun:test"
import {
  hostOf,
  publicUrl,
  redactCredentials,
  withCredentials,
} from "#git/urls"

describe("credentials", () => {
  const url = "https://user:s3cr%40t@git.example/doc.git"

  test("the public URL hides the user and the password", () => {
    expect(publicUrl(url)).toBe("https://***@git.example/doc.git")
    expect(publicUrl("git@git.example:doc.git")).toBe("git@git.example:doc.git")
  })

  test("text is redacted of the encoded and decoded password and the user", () => {
    expect(
      redactCredentials("fatal: s3cr%40t, s3cr@t and user rejected", url)
    ).toBe("fatal: ***, *** and *** rejected")
  })
})

describe("withCredentials", () => {
  test("sets the username and the encoded token", () => {
    expect(withCredentials("https://git.example/org/doc", "ana", "a/b@c")).toBe(
      "https://ana:a%2Fb%40c@git.example/org/doc"
    )
  })

  test("replaces the credentials the URL carried", () => {
    expect(
      withCredentials("https://x:old@git.example/doc.git", "ana", "new")
    ).toBe("https://ana:new@git.example/doc.git")
  })

  test("leaves what is not a URL as it is", () => {
    expect(withCredentials("git@git.example:doc.git", "ana", "t")).toBe(
      "git@git.example:doc.git"
    )
  })
})

describe("hostOf", () => {
  test("is the lowercase host with its port", () => {
    expect(hostOf("https://Git.Example.com:8443/org/doc")).toBe(
      "git.example.com:8443"
    )
    expect(hostOf("https://ana:t@git.example.com/doc")).toBe("git.example.com")
    expect(hostOf("nope")).toBe(undefined)
  })
})
