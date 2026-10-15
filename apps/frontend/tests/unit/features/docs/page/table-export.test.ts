import { describe, expect, test } from "bun:test"
import {
  cellMarkdown,
  exportName,
  toCsv,
  toMarkdownTable,
} from "@/features/docs/page/model/table-export"

function cell(html: string): HTMLTableCellElement {
  const td = document.createElement("td")
  td.innerHTML = html
  return td
}

describe("toCsv", () => {
  test("separates with ;, quotes what needs it, ends lines with CRLF and starts with a BOM", () => {
    expect(
      toCsv(
        ["Nombre", "Notas"],
        [
          ["nas", 'dice "hola"; adiós'],
          ["pve-01", ""],
        ]
      )
    ).toBe('﻿Nombre;Notas\r\nnas;"dice ""hola""; adiós"\r\npve-01;\r\n')
  })
})

describe("cellMarkdown and toMarkdownTable", () => {
  test("links become full addresses, code is kept and pipes are escaped", () => {
    const md = cellMarkdown(
      cell(
        '<a href="/casa/red/dns">DNS</a> en <code>c11</code> | otra<br>línea'
      ),
      "https://docs.example.org"
    )
    expect(md).toBe(
      "[DNS](https://docs.example.org/casa/red/dns) en `c11` \\| otra línea"
    )
  })

  test("a highlighted match is plain text", () => {
    expect(cellMarkdown(cell("we<mark>b-0</mark>1"), "https://x.org")).toBe(
      "web-01"
    )
  })

  test("a GitHub table with its header row", () => {
    expect(toMarkdownTable(["Name", "IP"], [["nas", "10.0.0.1"]])).toBe(
      "| Name | IP |\n| --- | --- |\n| nas | 10.0.0.1 |"
    )
  })
})

describe("exportName", () => {
  test("the page and the heading, as a slug", () => {
    expect(exportName("Máquinas", "Las de C11")).toBe("maquinas-las-de-c11")
    expect(exportName("", null)).toBe("tabla")
  })
})
