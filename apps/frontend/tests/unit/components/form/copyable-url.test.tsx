import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { CopyableUrl } from "@/components/shared/form/copyable-url"

const URL = "https://docs.example.com/git/notas.git"

afterEach(() => {
  cleanup()
})

describe("CopyableUrl", () => {
  test("shows the URL with a control named to copy it", () => {
    render(<CopyableUrl url={URL} copyLabel="Copiar la URL de git de Notas" />)

    expect(screen.getByText(URL)).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Copiar la URL de git de Notas" })
    ).toBeDefined()
  })

  test("a stacked label sits outside the well, an inline one inside it", () => {
    const { rerender } = render(
      <CopyableUrl url={URL} copyLabel="Copiar" label="URL de git" />
    )
    const well = () => screen.getByText(URL).parentElement
    expect(well()?.textContent).not.toContain("URL de git")
    expect(screen.getByText("URL de git")).toBeDefined()

    rerender(
      <CopyableUrl
        url={URL}
        copyLabel="Copiar"
        label="URL de git"
        labelPlacement="inline"
      />
    )
    expect(well()?.textContent).toContain("URL de git")
  })

  test("without a label only the URL is shown", () => {
    render(<CopyableUrl url={URL} copyLabel="Copiar" />)

    expect(screen.queryByText("URL de git")).toBeNull()
  })
})
