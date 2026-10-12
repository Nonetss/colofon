import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

// AppLink reaches Astro's client router, which only exists under Astro.
mock.module("astro:transitions/client", () => ({ navigate: () => {} }))

const { DataTableIdentityCell } = await import(
  "@/components/shared/data-display/data-table-cell-content"
)

afterEach(() => {
  cleanup()
})

describe("DataTableIdentityCell", () => {
  test("renders the primary and secondary values as plain text", () => {
    render(<DataTableIdentityCell primary="Ana" secondary="ana@example.com" />)

    expect(screen.getByText("Ana")).toBeDefined()
    expect(screen.getByText("ana@example.com")).toBeDefined()
    expect(screen.queryByRole("button")).toBeNull()
  })

  test("links to href", () => {
    render(<DataTableIdentityCell primary="Acme" href="/admin/orgs/acme" />)

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/admin/orgs/acme"
    )
  })

  test("opens through a button named by label", () => {
    const onOpen = mock(() => {})
    render(
      <DataTableIdentityCell
        primary="Acme"
        onOpen={onOpen}
        label="Abrir Acme"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Abrir Acme" }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test("renders plain text while disabled", () => {
    render(<DataTableIdentityCell primary="Acme" onOpen={() => {}} disabled />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  test("sets the leading visual before the text, outside the open control", () => {
    render(
      <DataTableIdentityCell
        primary="Acme"
        onOpen={() => {}}
        label="Abrir Acme"
        leading={<span data-testid="leading" />}
      />
    )

    const leading = screen.getByTestId("leading")
    const button = screen.getByRole("button", { name: "Abrir Acme" })
    expect(button.contains(leading)).toBe(false)
    expect(
      leading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  test("omits the leading wrapper when no leading visual is given", () => {
    const { container } = render(<DataTableIdentityCell primary="Acme" />)

    expect(container.querySelector(".gap-3")).toBeNull()
  })
})
