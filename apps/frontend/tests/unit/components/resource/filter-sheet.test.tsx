import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { FilterSheet } from "@/components/shared/resource/filter-sheet"

afterEach(() => {
  cleanup()
})

function renderSheet(resultCount: number | null | undefined) {
  const onApply = mock(() => {})
  const onOpenChange = mock((_open: boolean) => {})
  render(
    <FilterSheet
      open
      onOpenChange={onOpenChange}
      resultCount={resultCount}
      onApply={onApply}
    >
      <p>Campos</p>
    </FilterSheet>
  )
  return { onApply, onOpenChange }
}

describe("FilterSheet", () => {
  test.each([
    [12, "Ver 12 resultados"],
    [1, "Ver 1 resultado"],
    [0, "Sin resultados"],
    [undefined, "Cargando…"],
    [null, "Ver resultados"],
  ])("with a count of %p the confirm button reads %p", (count, label) => {
    renderSheet(count)
    expect(screen.getByRole("button", { name: label })).toBeDefined()
  })

  test("confirming applies and closes the sheet", () => {
    const { onApply, onOpenChange } = renderSheet(null)

    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
