import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import {
  SortControls,
  type SortOption,
} from "@/components/shared/resource/sort-controls"

type Key = "ip" | "mac"

const options: SortOption<Key>[] = [
  { value: "ip", label: "IP" },
  { value: "mac", label: "MAC" },
]

afterEach(() => {
  cleanup()
})

describe("SortControls", () => {
  test("names the key select and gives it the page's id", () => {
    render(
      <SortControls
        idPrefix="hosts-sort"
        idSuffix="desktop"
        options={options}
        value="ip"
        order="asc"
        onChange={() => {}}
      />
    )
    const select = screen.getByRole("combobox", { name: "Ordenar por" })
    expect(select.id).toBe("hosts-sort-desktop")
  })

  test("picking another key keeps the direction", async () => {
    const onChange = mock(() => {})
    render(
      <SortControls
        idPrefix="hosts-sort"
        idSuffix="desktop"
        options={options}
        value="ip"
        order="desc"
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: "Ordenar por" }))
    // Base UI commits a pick on the pointer sequence, not on `click` alone.
    const option = await screen.findByRole("option", { name: "MAC" })
    fireEvent.pointerDown(option)
    fireEvent.mouseDown(option)
    fireEvent.pointerUp(option)
    fireEvent.mouseUp(option)
    fireEvent.click(option)
    expect(onChange).toHaveBeenCalledWith({ sort: "mac", order: "desc" })
  })

  test("the toggle names the current direction and flips it", () => {
    const onChange = mock(() => {})
    render(
      <SortControls
        idPrefix="hosts-sort"
        idSuffix="desktop"
        options={options}
        value="mac"
        order="asc"
        onChange={onChange}
      />
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "Orden ascendente: cambiar a descendente",
      })
    )
    expect(onChange).toHaveBeenCalledWith({ sort: "mac", order: "desc" })
  })

  test("a descending order offers to switch back", () => {
    render(
      <SortControls
        idPrefix="hosts-sort"
        idSuffix="mobile"
        options={options}
        value="ip"
        order="desc"
        onChange={() => {}}
      />
    )
    expect(
      screen.getByRole("button", {
        name: "Orden descendente: cambiar a ascendente",
      })
    ).toBeDefined()
  })
})
