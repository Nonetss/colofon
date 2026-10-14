import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"

afterEach(() => {
  cleanup()
})

describe("FilteredEmpty", () => {
  test("shows the message and a clear action that calls onClear", () => {
    const onClear = mock(() => {})
    render(
      <FilteredEmpty
        message="Ningún usuario coincide con los filtros."
        onClear={onClear}
      />
    )

    expect(
      screen.getByText("Ningún usuario coincide con los filtros.")
    ).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  test("draws the clear-filters icon inside the action", () => {
    render(<FilteredEmpty message="Sin resultados." onClear={() => {}} />)

    const button = screen.getByRole("button", { name: "Limpiar filtros" })
    expect(button.querySelector("svg")).not.toBeNull()
  })

  test("hides the clear action when nothing is clearable", () => {
    render(
      <FilteredEmpty
        message="Ningún cron coincide con los filtros."
        onClear={() => {}}
        clearable={false}
      />
    )

    expect(
      screen.getByText("Ningún cron coincide con los filtros.")
    ).toBeDefined()
    expect(screen.queryByRole("button")).toBeNull()
  })

  test("uses a custom clear label", () => {
    render(
      <FilteredEmpty
        message="Sin resultados."
        onClear={() => {}}
        clearLabel="Quitar filtros"
      />
    )

    expect(screen.getByRole("button", { name: "Quitar filtros" })).toBeDefined()
  })
})
