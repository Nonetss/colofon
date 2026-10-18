import { describe, expect, test } from "bun:test"
import {
  PlaceholderError,
  parseTemplate,
  placeholdersOf,
  renderExpression,
  renderTemplate,
} from "#v1/secret/request/placeholders"

const isSecretName = (name: string) => name === "komodo" || name === "npm"
const values: Record<string, string> = {
  "komodo.key": "k3y-value",
  "npm.username": "alice",
  "npm.password": "p@ss word",
}

function render(text: string): string {
  const template = parseTemplate(text, "header", isSecretName)
  return renderTemplate(template, (placeholder) =>
    renderExpression(placeholder.expression, (ref) => {
      const value = values[`${ref.secret}.${ref.field}`]
      if (value === undefined) throw new Error("unknown ref")
      return value
    })
  )
}

describe("parseTemplate", () => {
  test("substitutes a ref, with or without spaces in the braces", () => {
    expect(render("Bearer {{komodo.key}}")).toBe("Bearer k3y-value")
    expect(render("{{ komodo.key }}")).toBe("k3y-value")
  })

  test("basic is the Base64 of user:password", () => {
    expect(render("Basic {{basic(npm.username, npm.password)}}")).toBe(
      `Basic ${Buffer.from("alice:p@ss word").toString("base64")}`
    )
  })

  test("base64 and urlencode encode one value", () => {
    expect(render("{{base64(npm.password)}}")).toBe(
      Buffer.from("p@ss word").toString("base64")
    )
    expect(render("q={{urlencode(npm.password)}}")).toBe("q=p%40ss%20word")
  })

  test("records each placeholder with its location", () => {
    const template = parseTemplate(
      "/stacks/{{komodo.key}}?x={{npm.username}}",
      "url",
      isSecretName
    )

    expect(
      placeholdersOf(template).map((placeholder) => [
        placeholder.raw,
        placeholder.location,
      ])
    ).toEqual([
      ["{{komodo.key}}", "url"],
      ["{{npm.username}}", "url"],
    ])
  })

  test("a ref to an unknown secret is still a placeholder", () => {
    const template = parseTemplate("{{grafna.token}}", "header", isSecretName)

    expect(placeholdersOf(template)).toHaveLength(1)
  })

  test("leaves templates that aren't placeholders as literal text", () => {
    const text = "Alert {{ $labels.instance }} on {{ .Values.name }} {{name}}"
    const template = parseTemplate(text, "body", isSecretName)

    expect(placeholdersOf(template)).toEqual([])
    expect(render(text)).toBe(text)
  })

  test.each([
    ["{{komodo}}", "names a secret"],
    ["{{ komodo.Key }}", "names a secret with a bad field"],
    ["{{basic(npm.username)}}", "basic with one field"],
    ["{{base64(npm.username, npm.password)}}", "base64 with two fields"],
    ["{{urlencode komodo.key}}", "a function without parentheses"],
    ["Bearer {{komodo.key", "an unclosed placeholder"],
  ])("rejects %p (%s)", (text) => {
    expect(() => parseTemplate(text, "header", isSecretName)).toThrow(
      PlaceholderError
    )
  })

  test("the error quotes the placeholder", () => {
    expect(() => parseTemplate("{{komodo}}", "header", isSecretName)).toThrow(
      "{{komodo}}"
    )
  })
})
