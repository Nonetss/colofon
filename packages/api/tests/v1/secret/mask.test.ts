import { describe, expect, test } from "bun:test"
import { createMasker } from "#v1/secret/request/mask"

const key = "komodo-key-value"

describe("createMasker", () => {
  test("masks a value raw and in its encodings", () => {
    const mask = createMasker([{ label: "komodo.key", text: key }])
    const base64 = Buffer.from(key).toString("base64")

    expect(mask(`{"echo":"${key}","b":"${base64}"}`)).toBe(
      '{"echo":"[secret:komodo.key]","b":"[secret:komodo.key]"}'
    )
  })

  test("masks the percent-encoded and JSON-escaped forms", () => {
    const value = 'p@ss "word"'
    const mask = createMasker([{ label: "npm.password", text: value }])

    expect(mask(`q=${encodeURIComponent(value)}`)).toBe(
      "q=[secret:npm.password]"
    )
    expect(mask(JSON.stringify({ v: value }))).toBe(
      '{"v":"[secret:npm.password]"}'
    )
  })

  test("masks a combined basic header whole, and each value in it", () => {
    const basic = Buffer.from("alice:hunter22").toString("base64")
    const mask = createMasker([
      { label: "npm.username", text: "alice" },
      { label: "npm.password", text: "hunter22" },
      { label: null, text: basic },
    ])

    const echoed = mask(
      `{"authorization":"Basic ${basic}","user":"alice","password":"hunter22"}`
    )

    expect(echoed).toBe(
      '{"authorization":"Basic [secret]","user":"[secret:npm.username]","password":"[secret:npm.password]"}'
    )
  })

  test("leaves values shorter than 4 characters alone", () => {
    const mask = createMasker([{ label: "x.pin", text: "123" }])

    expect(mask("code 123")).toBe("code 123")
  })
})
