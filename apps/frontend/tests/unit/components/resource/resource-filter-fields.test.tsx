import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import {
  type ResourceFilterDescriptor,
  ResourceFilterFields,
} from "@/components/shared/resource/resource-filters"

afterEach(() => {
  cleanup()
})

function facet(key: string, label: string, optionLabel: string) {
  return {
    key,
    kind: "facet",
    label,
    options: [{ value: optionLabel.toLowerCase(), label: optionLabel }],
    value: { include: [], exclude: [] },
    onChange: () => {},
    excludable: false,
  } satisfies ResourceFilterDescriptor
}

describe("ResourceFilterFields", () => {
  test("shows a lone facet section's options without opening it", () => {
    render(
      <ResourceFilterFields
        filters={[facet("services", "Servicios", "Backend")]}
      />
    )

    expect(screen.getByText("Servicios")).toBeDefined()
    expect(screen.getByText("Backend")).toBeDefined()
    expect(screen.queryByRole("button", { name: "Servicios" })).toBeNull()
  })

  test("keeps several inactive facet sections folded behind their titles", () => {
    render(
      <ResourceFilterFields
        filters={[
          facet("services", "Servicios", "Backend"),
          facet("status", "Estado", "Activo"),
        ]}
      />
    )

    expect(screen.getByRole("button", { name: "Servicios" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Estado" })).toBeDefined()
    expect(screen.queryByText("Backend")).toBeNull()
    expect(screen.queryByText("Activo")).toBeNull()
  })
})
