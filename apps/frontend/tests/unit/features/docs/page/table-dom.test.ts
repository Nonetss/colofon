import { afterEach, describe, expect, test } from "bun:test"
import {
  applyView,
  markIn,
  prepareTables,
  unmark,
} from "@/features/docs/page/model/table-dom"
import { tableTerms } from "@/features/docs/page/model/table-query"

function frame(rows: string[][], kv = false): string {
  const body = rows
    .map(
      (cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
    )
    .join("")
  const attribute = kv ? " data-table-kv" : ""
  return `<div class="doc-table"${attribute}><table><thead><tr><th>Name</th><th>IP</th></tr></thead><tbody>${body}</tbody></table></div>`
}

const machines = Array.from({ length: 9 }, (_, n) => [
  `Máquina ${n}`,
  `10.0.0.${9 - n}`,
])

function page(html: string): HTMLElement {
  const root = document.createElement("div")
  root.className = "doc"
  root.innerHTML = html
  document.body.append(root)
  return root
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("prepareTables", () => {
  test("ids from the heading above and the place under it; key/value tables are left alone", () => {
    const root = page(
      `${frame([["a", "1"]])}<h2 id="stacks">Stacks</h2>${frame([["b", "2"]])}${frame([["c", "3"]])}${frame([["k", "v"]], true)}`
    )
    const tables = prepareTables(root)
    expect(tables.map((table) => table.id)).toEqual([
      "tabla-1",
      "stacks-1",
      "stacks-2",
    ])
    expect(tables[1]?.heading).toBe("Stacks")
    expect(root.querySelectorAll(".doc-table-box")).toHaveLength(3)
    expect(prepareTables(root)).toHaveLength(0)
  })

  test("headers become sort buttons, with filter slots only on full tables", () => {
    const root = page(frame(machines) + frame([["a", "1"]]))
    const [full, small] = prepareTables(root)
    expect(full?.sortButtons[0]?.textContent).toBe("Name")
    expect(full?.filterSlots).toHaveLength(2)
    expect(
      full?.headers[0]?.querySelector(".doc-table-th")?.lastElementChild
    ).toBe(full?.filterSlots[0])
    expect(full?.headers[0]?.querySelector(".doc-table-resize")).not.toBeNull()
    expect(small?.filterSlots).toHaveLength(0)
    expect(small?.headers[0]?.querySelector(".doc-table-resize")).not.toBeNull()
  })

  test("a column of long text gets no filter slot", () => {
    const root = page(
      frame([
        ["titulo", "x".repeat(41)],
        ["icono", "Opcional. El nombre de un icono de Lucide."],
      ])
    )
    const [dom] = prepareTables(root)
    expect(dom?.filterSlots[0]).toBeInstanceOf(HTMLElement)
    expect(dom?.filterSlots[1]).toBeUndefined()
  })
})

describe("applyView", () => {
  test("orders the rows, hides columns, marks the sort and highlights the box's words", () => {
    const [dom] = prepareTables(page(frame(machines)))
    if (dom === undefined) throw new Error("No table")
    const rows = dom.model.rows
    const second = rows[8]
    const first = rows[0]
    if (second === undefined || first === undefined) throw new Error("No rows")
    applyView(dom, {
      hidden: [],
      sorting: [
        { id: "ip", desc: false },
        { id: "name", desc: true },
      ],
      page: [second, first],
      filteredCount: 2,
      terms: tableTerms("maquina", ["Name", "IP"]),
    })
    const shown = [...dom.tbody.querySelectorAll("tr")].map(
      (row) => row.querySelectorAll("td")[0]?.textContent
    )
    expect(shown).toEqual(["Máquina 8", "Máquina 0"])
    expect(dom.headers[1]?.getAttribute("aria-sort")).toBe("ascending")
    expect(dom.sortButtons[1]?.dataset.sortIndex).toBe("1")
    expect(dom.sortButtons[0]?.dataset.sortIndex).toBe("2")
    expect(dom.tbody.querySelectorAll("mark")).toHaveLength(2)

    applyView(dom, {
      hidden: ["ip"],
      sorting: [],
      page: rows,
      filteredCount: rows.length,
      terms: [],
    })
    expect(dom.headers[1]?.hidden).toBe(true)
    expect(dom.rows[0]?.querySelectorAll("td")[1]?.hidden).toBe(true)
    expect(dom.tbody.querySelectorAll("mark")).toHaveLength(0)
    expect(dom.sortButtons[1]?.dataset.sortIndex).toBeUndefined()
  })

  test("no row passing the filters marks the frame empty", () => {
    const [dom] = prepareTables(page(frame(machines)))
    if (dom === undefined) throw new Error("No table")
    applyView(dom, {
      hidden: [],
      sorting: [],
      page: [],
      filteredCount: 0,
      terms: [],
    })
    expect(dom.frame.hasAttribute("data-empty")).toBe(true)
  })
})

describe("markIn and unmark", () => {
  test("marks every match, accents aside, and restores the text", () => {
    const cell = document.createElement("td")
    cell.innerHTML = 'Málaga y <a href="/x">malaga</a>'
    markIn(cell, ["malaga"])
    expect(cell.innerHTML).toBe(
      '<mark data-table-mark="">Málaga</mark> y <a href="/x"><mark data-table-mark="">malaga</mark></a>'
    )
    unmark(cell)
    expect(cell.innerHTML).toBe('Málaga y <a href="/x">malaga</a>')
  })
})
