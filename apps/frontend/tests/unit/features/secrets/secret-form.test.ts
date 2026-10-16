import { describe, expect, test } from "bun:test"
import {
  createInputOf,
  emptySecretForm,
  newFieldDraft,
  originsFromText,
  type SecretFormValues,
  secretFormFrom,
  secretFormProblems,
  updateInputOf,
} from "@/features/secrets/manage/model/secret-form"
import type { SecretListItem } from "@/features/secrets/manage/model/types"

const komodo: SecretListItem = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "komodo",
  description: "Komodo de casa",
  fields: ["key", "secret"],
  origins: ["https://komodo.casa.lan", "http://10.0.0.5:9120"],
  allowWrite: true,
  allowInUrl: false,
  allowInBody: false,
  unreadable: false,
  lastUsedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

function filled(overrides: Partial<SecretFormValues> = {}): SecretFormValues {
  return {
    ...emptySecretForm(),
    name: "npm",
    origins: "https://registry.npmjs.org",
    fields: [{ ...newFieldDraft(), name: "token", value: "tok-1234" }],
    ...overrides,
  }
}

describe("secretFormFrom", () => {
  test("lists the stored fields with empty values and one origin per line", () => {
    const form = secretFormFrom(komodo)

    expect(
      form.fields.map(({ name, value, stored }) => ({ name, value, stored }))
    ).toEqual([
      { name: "key", value: "", stored: true },
      { name: "secret", value: "", stored: true },
    ])
    expect(form.origins).toBe("https://komodo.casa.lan\nhttp://10.0.0.5:9120")
    expect(form.description).toBe("Komodo de casa")
  })
})

describe("updateInputOf", () => {
  test("editing only the description keeps every stored value", () => {
    const form = { ...secretFormFrom(komodo), description: "Otra" }

    expect(updateInputOf(komodo.id, form)).toEqual({
      id: komodo.id,
      name: "komodo",
      description: "Otra",
      origins: ["https://komodo.casa.lan", "http://10.0.0.5:9120"],
      allowWrite: true,
      allowInUrl: false,
      allowInBody: false,
      fields: [{ name: "key" }, { name: "secret" }],
    })
  })

  test("sends a typed value and drops a removed field", () => {
    const [key] = secretFormFrom(komodo).fields
    if (key === undefined) throw new Error("no field")
    const form = {
      ...secretFormFrom(komodo),
      fields: [{ ...key, value: "new-key" }],
    }

    expect(updateInputOf(komodo.id, form).fields).toEqual([
      { name: "key", value: "new-key" },
    ])
  })

  test("an empty description is sent as null", () => {
    const form = { ...secretFormFrom(komodo), description: "  " }

    expect(updateInputOf(komodo.id, form).description).toBeNull()
  })
})

describe("createInputOf", () => {
  test("trims names, splits the origins and sends every value", () => {
    const input = createInputOf(
      filled({
        name: " npm ",
        origins: " https://registry.npmjs.org \n\n https://npm.casa.lan ",
      })
    )

    expect(input).toEqual({
      name: "npm",
      description: null,
      origins: ["https://registry.npmjs.org", "https://npm.casa.lan"],
      allowWrite: false,
      allowInUrl: false,
      allowInBody: false,
      fields: [{ name: "token", value: "tok-1234" }],
    })
  })
})

describe("originsFromText", () => {
  test("keeps the non-empty trimmed lines", () => {
    expect(originsFromText("a\n  \n b \n")).toEqual(["a", "b"])
  })
})

describe("secretFormProblems", () => {
  test("a complete form has none", () => {
    expect(secretFormProblems(filled(), false)).toEqual({})
  })

  test("flags a bad name, no origins and a new field without a value", () => {
    const problems = secretFormProblems(
      filled({
        name: "Mi Secreto",
        origins: " \n ",
        fields: [{ ...newFieldDraft(), name: "token", value: "" }],
      }),
      false
    )

    expect(Object.keys(problems).sort()).toEqual(["fields", "name", "origins"])
    expect(problems.fields).toContain("token")
  })

  test("flags repeated and malformed field names", () => {
    const twice = filled({
      fields: [
        { ...newFieldDraft(), name: "key", value: "a1234" },
        { ...newFieldDraft(), name: "key", value: "b1234" },
      ],
    })
    const malformed = filled({
      fields: [{ ...newFieldDraft(), name: "API-Key", value: "a1234" }],
    })

    expect(secretFormProblems(twice, false).fields).toContain("repetir")
    expect(secretFormProblems(malformed, false).fields).toBeDefined()
  })

  test("a stored field may stay empty, unless the secret is unreadable", () => {
    const form = secretFormFrom(komodo)

    expect(secretFormProblems(form, false)).toEqual({})
    expect(secretFormProblems(form, true).fields).toContain("key")
  })
})
