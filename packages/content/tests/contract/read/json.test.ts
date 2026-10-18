import { describe, expect, test } from "bun:test"
import { parseJson } from "#contract/read/json"
import type { ContentProblem } from "#contract/read/problems"

describe("parseJson", () => {
  function parsed(text: string) {
    const problems: ContentProblem[] = []
    const data = parseJson(text, "diagrams/red.json", problems)
    return { data, problems }
  }

  test("a valid object is returned as it is, with no problem", () => {
    expect(parsed('{ "title": "Red", "nodes": [1, 2] }')).toEqual({
      data: { title: "Red", nodes: [1, 2] },
      problems: [],
    })
  })

  test("a syntax error is reported with its line and column", () => {
    const { data, problems } = parsed('{\n  "title": "Red"\n  "desc": "x"\n}')
    expect(data).toBeUndefined()
    expect(problems).toEqual([
      {
        file: "diagrams/red.json",
        message:
          "JSON no válido en la línea 3, columna 3: falta una coma entre dos elementos",
      },
    ])
  })

  test("a trailing comma is refused", () => {
    const { data, problems } = parsed('{ "nodes": [1, 2,] }')
    expect(data).toBeUndefined()
    expect(problems[0]?.message).toContain("línea 1, columna 18")
  })

  test("a comment is refused", () => {
    const { problems } = parsed('{ // red\n "title": "Red" }')
    expect(problems[0]?.message).toContain("JSON no admite comentarios")
  })

  test("an empty file is reported as empty", () => {
    expect(parsed("  \n").problems).toEqual([
      { file: "diagrams/red.json", message: "Está vacío" },
    ])
  })
})
