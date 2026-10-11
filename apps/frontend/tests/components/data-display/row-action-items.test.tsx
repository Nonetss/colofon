import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import {
  type RowActionDescriptor,
  RowActions,
  visibleRowActions,
} from "@/components/shared/data-display/row-action-items"

type User = { id: string; name: string; banned: boolean }

const ana: User = { id: "1", name: "Ana", banned: true }

function actions(
  onDelete: (user: User) => void
): RowActionDescriptor<User, void>[] {
  return [
    {
      key: "ban",
      label: (user) => {
        if (user.banned) return "Quitar baneo"
        return "Banear"
      },
      onSelect: () => {},
    },
    {
      key: "promote",
      label: "Hacer admin",
      disabled: (user) => user.banned,
      onSelect: () => {},
    },
    {
      key: "secret",
      label: "Oculta",
      hidden: () => true,
      onSelect: () => {},
    },
    {
      key: "delete",
      label: "Eliminar",
      destructive: true,
      onSelect: onDelete,
    },
  ]
}

function open(onDelete: (user: User) => void = () => {}) {
  render(
    <RowActions
      actions={actions(onDelete)}
      item={ana}
      context={undefined}
      accessibleLabel="Ana"
    />
  )
  fireEvent.click(screen.getByRole("button", { name: "Acciones para Ana" }))
}

afterEach(() => {
  cleanup()
})

describe("RowActions", () => {
  test("names the menu and each item after the row", () => {
    open()

    expect(
      screen.getByRole("menuitem", { name: "Quitar baneo Ana" })
    ).toBeDefined()
    expect(screen.getByRole("menuitem", { name: "Eliminar Ana" })).toBeDefined()
  })

  test("leaves hidden descriptors out and disables per row", () => {
    open()

    expect(screen.queryByRole("menuitem", { name: /Oculta/ })).toBeNull()
    const promote = screen.getByRole("menuitem", { name: "Hacer admin Ana" })
    expect(promote.getAttribute("aria-disabled")).toBe("true")
  })

  test("separates the first destructive item from the ones before it", () => {
    open()

    const menu = screen.getByRole("menu")
    const roles = Array.from(menu.querySelectorAll("[role]")).map((node) =>
      node.getAttribute("role")
    )
    const deleteIndex = roles.lastIndexOf("menuitem")
    expect(roles[deleteIndex - 1]).toBe("separator")
  })

  test("passes the row to the selected action", () => {
    const onDelete = mock((_user: User) => {})
    open(onDelete)

    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar Ana" }))
    expect(onDelete).toHaveBeenCalledWith(ana, undefined)
  })

  test("renders nothing when no descriptor is visible", () => {
    const hiddenOnly = actions(() => {}).filter((action) => action.hidden)
    const { container } = render(
      <RowActions actions={hiddenOnly} item={ana} context={undefined} />
    )

    expect(visibleRowActions(hiddenOnly, ana, undefined)).toEqual([])
    expect(container.innerHTML).toBe("")
  })
})
