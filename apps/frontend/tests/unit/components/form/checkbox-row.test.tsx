import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"

afterEach(() => {
  cleanup()
})

function checkedState(name: string | RegExp) {
  return screen.getByRole("checkbox", { name }).getAttribute("aria-checked")
}

describe("CheckboxRow", () => {
  test("the label, its detail and its count name the checkbox", () => {
    render(
      <ul>
        <CheckboxRow
          id="row"
          label="Ana"
          detail="ana@example.com"
          count={3}
          checked
          onCheckedChange={() => {}}
        />
      </ul>
    )

    expect(checkedState(/Ana/)).toBe("true")
    expect(
      screen.getByRole("checkbox", { name: /ana@example\.com/ })
    ).toBeDefined()
    expect(screen.getByRole("checkbox", { name: /3/ })).toBeDefined()
  })

  test("clicking the label reports the next state", () => {
    const onCheckedChange = mock((_: boolean) => {})
    render(
      <ul>
        <CheckboxRow
          id="row"
          label="VLAN"
          checked={false}
          onCheckedChange={onCheckedChange}
        />
      </ul>
    )

    fireEvent.click(screen.getByText("VLAN"))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  test("a disabled row ignores clicks and shows its note", () => {
    const onCheckedChange = mock((_: boolean) => {})
    render(
      <CheckboxRow
        as="div"
        id="row"
        label="IP"
        note="Siempre visible"
        checked
        disabled
        onCheckedChange={onCheckedChange}
      />
    )

    fireEvent.click(screen.getByRole("checkbox", { name: /IP/ }))
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByText("Siempre visible")).toBeDefined()
  })

  test("the action sits outside the label", () => {
    render(
      <CheckboxRow
        as="div"
        id="row"
        label="Nombre"
        checked
        onCheckedChange={() => {}}
        action={<button type="button">Mover Nombre</button>}
      />
    )

    expect(screen.getByRole("checkbox", { name: "Nombre" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Mover Nombre" })).toBeDefined()
  })
})
