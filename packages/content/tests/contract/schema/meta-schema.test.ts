import { describe, expect, test } from "bun:test"
import { createMetaSchemas } from "#contract/schema/meta-schema"

const meta = createMetaSchemas()
const metaWithTypes = createMetaSchemas({ typeIds: ["maquinas", "centros"] })

function messages(result: { error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe("fieldDefinition", () => {
  test("accepts every kind, nested lists and objects included", () => {
    const fields = [
      { type: "text", optional: true, description: "Una línea" },
      { type: "enum", values: ["vm", "fisica"] },
      { type: "ref", to: "maquinas" },
      { type: "list", of: { type: "list", of: { type: "date" } } },
      {
        type: "object",
        fields: {
          puertos: { type: "list", of: { type: "text" } },
          host: { type: "ref", to: "centros" },
        },
      },
    ]
    for (const field of fields) {
      expect(meta.fieldDefinition.safeParse(field).success).toBe(true)
    }
  })

  test("an unknown kind or an unknown key is refused", () => {
    expect(meta.fieldDefinition.safeParse({ type: "cadena" }).success).toBe(
      false
    )
    expect(
      meta.fieldDefinition.safeParse({ type: "text", obligatorio: true })
        .success
    ).toBe(false)
  })

  test("any field, nested ones included, may name itself with label", () => {
    const field = {
      type: "object",
      label: "Red",
      fields: { ip: { type: "ip", label: "Dirección IP" } },
    }
    expect(meta.fieldDefinition.safeParse(field).success).toBe(true)
  })

  test("an empty label is refused with its path", () => {
    const result = meta.siteConfig.safeParse({
      name: "Homelab",
      contract: "2",
      header: { files: { type: "text", label: "" } },
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "header.files.label",
    ])
  })

  test("an enum needs at least one value", () => {
    expect(
      meta.fieldDefinition.safeParse({ type: "enum", values: [] }).success
    ).toBe(false)
  })

  test("with typeIds, a ref must name one of them, also inside a list", () => {
    expect(
      metaWithTypes.fieldDefinition.safeParse({ type: "ref", to: "centros" })
        .success
    ).toBe(true)
    expect(
      metaWithTypes.fieldDefinition.safeParse({
        type: "list",
        of: { type: "ref", to: "personas" },
      }).success
    ).toBe(false)
  })

  test("an object needs at least one field", () => {
    const result = meta.fieldDefinition.safeParse({
      type: "object",
      fields: {},
    })
    expect(messages(result)).toContain("Declara al menos un campo")
  })
})

describe("typeDefinition", () => {
  const type = {
    name: "Máquina",
    plural: "Máquinas",
    title_field: "name",
    fields: { name: { type: "text" }, ip: { type: "ip" } },
    view: { columns: ["id", "name", "ip", "updated"] },
  }

  test("accepts a type whose label and columns are its fields, id or reserved fields", () => {
    expect(meta.typeDefinition.safeParse(type).success).toBe(true)
  })

  test("a label or a column that is not a field is refused with its path", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      title_field: "hostname",
      view: { columns: ["ip", "uso"] },
    })
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["title_field"],
      ["view", "columns", 1],
    ])
  })

  test("the reserved entity fields cannot be declared", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      fields: { ...type.fields, source: { type: "text" } },
    })
    expect(messages(result)).toEqual([
      "`source` no se puede declarar: toda entidad lo admite sin declararlo",
    ])
  })

  test("a field name with capitals or accents is refused", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      fields: { Ubicación: { type: "text" } },
    })
    expect(result.success).toBe(false)
  })

  test("icon is a Lucide icon name", () => {
    expect(
      meta.typeDefinition.safeParse({ ...type, icon: "map-pin" }).success
    ).toBe(true)
    const result = meta.typeDefinition.safeParse({ ...type, icon: "cohete" })
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["icon"]])
    expect(messages(result)[0]).toStartWith(
      "`cohete` no es un nombre de icono de Lucide"
    )
  })
})

describe("siteConfig", () => {
  test("accepts a site with extra header fields", () => {
    const result = meta.siteConfig.safeParse({
      name: "Homelab",
      contract: "2",
      header: { pendientes: { type: "list", of: { type: "text" } } },
    })
    expect(result.success).toBe(true)
  })

  test("the platform version is a quoted known major", () => {
    const result = meta.siteConfig.safeParse({
      name: "Homelab",
      contract: 2,
    })
    expect(messages(result)).toEqual([
      '`contract` es la versión del contrato, entre comillas: "2"',
    ])
  })

  test("the common page header fields cannot be redeclared", () => {
    const result = meta.siteConfig.safeParse({
      name: "Homelab",
      contract: "2",
      header: { title: { type: "text" } },
    })
    expect(messages(result)).toEqual([
      "`title` no se puede declarar: toda ficha lo tiene sin declararlo",
    ])
  })
})
