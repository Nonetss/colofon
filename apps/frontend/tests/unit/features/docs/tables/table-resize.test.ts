import { afterEach, describe, expect, test } from "bun:test"
import { prepareTables } from "@/features/docs/tables/model/table-dom"
import {
  applyColumnWidths,
  columnLayout,
  widthsAfterResize,
} from "@/features/docs/tables/model/table-resize"

function frame(rows: string[][]): string {
  const body = rows
    .map(
      (cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
    )
    .join("")
  return `<div class="doc-table"><table><thead><tr><th>Name</th><th>IP</th><th>Role</th></tr></thead><tbody>${body}</tbody></table></div>`
}

function page(): HTMLElement {
  const root = document.createElement("div")
  root.className = "doc"
  root.innerHTML = frame([
    ["a", "1", "web"],
    ["b", "2", "db"],
  ])
  document.body.append(root)
  return root
}

function sized(header: HTMLTableCellElement, width: number): void {
  header.getBoundingClientRect = () => new DOMRect(0, 0, width, 20)
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("widthsAfterResize", () => {
  const hidden = [false, false, false]

  test("a column takes its growth from the next one", () => {
    expect(widthsAfterResize([200, 200, 200], hidden, 0, 50)).toEqual([
      250, 150, 200,
    ])
  })

  test("neither column goes under the minimum", () => {
    expect(widthsAfterResize([200, 100], [false, false], 0, 50)).toEqual([
      204, 96,
    ])
  })

  test("the last column has no neighbor, so nothing moves", () => {
    expect(widthsAfterResize([200, 200], [false, false], 1, 40)).toEqual([
      200, 200,
    ])
  })

  test("a hidden column is not the neighbor", () => {
    expect(
      widthsAfterResize([200, 200, 200], [false, true, false], 0, 30)
    ).toEqual([230, 200, 170])
  })
})

describe("columnLayout", () => {
  test("hidden columns take no width and the table is the rest", () => {
    expect(columnLayout([120, 200, 80], [false, true, false])).toEqual({
      columnWidths: ["120px", "0px", "80px"],
      tableWidth: 200,
    })
  })
})

describe("column resize on the table", () => {
  test("arrow keys set the widths and double-click clears them", () => {
    const [dom] = prepareTables(page())
    if (dom === undefined) throw new Error("No table")
    const [name, ip, role] = dom.headers
    if (name === undefined || ip === undefined || role === undefined) {
      throw new Error("No header")
    }
    sized(name, 150)
    sized(ip, 220)
    sized(role, 180)
    const handle = name.querySelector(".doc-table-resize")
    if (!(handle instanceof HTMLElement)) throw new Error("No handle")

    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    )
    const cols = [...dom.table.querySelectorAll("col")]
    expect(cols.map((col) => col.style.width)).toEqual([
      "166px",
      "204px",
      "180px",
    ])
    expect(dom.table.style.tableLayout).toBe("fixed")
    expect(dom.table.style.width).toBe("550px")
    expect(handle.getAttribute("aria-valuenow")).toBe("166")

    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
    expect(dom.table.querySelector("colgroup")).toBeNull()
    expect(dom.table.style.width).toBe("")
  })

  test("dragging an edge keeps the total and a hidden column stays at zero", () => {
    const [dom] = prepareTables(page())
    if (dom === undefined) throw new Error("No table")
    const [name, ip, role] = dom.headers
    if (name === undefined || ip === undefined || role === undefined) {
      throw new Error("No header")
    }
    sized(name, 180)
    sized(ip, 180)
    sized(role, 180)
    const handle = name.querySelector(".doc-table-resize")
    if (!(handle instanceof HTMLElement)) throw new Error("No handle")

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        clientX: 100,
        pointerId: 1,
        bubbles: true,
      })
    )
    handle.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 140,
        pointerId: 1,
        bubbles: true,
      })
    )
    expect(
      [...dom.table.querySelectorAll("col")].map((col) => col.style.width)
    ).toEqual(["220px", "140px", "180px"])

    ip.hidden = true
    applyColumnWidths(dom.table, dom.headers, [220, 140, 180])
    expect(
      [...dom.table.querySelectorAll("col")].map((col) => col.style.width)
    ).toEqual(["220px", "0px", "180px"])
    expect(dom.table.style.width).toBe("400px")
  })

  test("only the last visible column has no handle", () => {
    const [dom] = prepareTables(page())
    if (dom === undefined) throw new Error("No table")
    const [name, ip, role] = dom.headers
    if (name === undefined || ip === undefined || role === undefined) {
      throw new Error("No header")
    }
    const hiddenHandles = () =>
      dom.headers.map(
        (header) =>
          header.querySelector<HTMLElement>(".doc-table-resize")?.hidden
      )
    expect(hiddenHandles()).toEqual([false, false, true])

    role.hidden = true
    applyColumnWidths(dom.table, dom.headers, null)
    expect(hiddenHandles()).toEqual([false, true, true])
  })
})
