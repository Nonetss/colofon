import { describe, expect, test } from "bun:test"
import { createMetaSchemas } from "#meta-schema"

const meta = createMetaSchemas()
const metaWithTypes = createMetaSchemas({ typeIds: ["maquinas", "centros"] })

function messages(result: { error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe("fieldDefinition", () => {
  test("accepts every kind, nested lists and objects included", () => {
    const fields = [
      { tipo: "texto", opcional: true, descripcion: "Una línea" },
      { tipo: "enum", valores: ["vm", "fisica"] },
      { tipo: "ref", a: "maquinas" },
      { tipo: "lista", de: { tipo: "lista", de: { tipo: "fecha" } } },
      {
        tipo: "objeto",
        campos: {
          puertos: { tipo: "lista", de: { tipo: "texto" } },
          host: { tipo: "ref", a: "centros" },
        },
      },
    ]
    for (const field of fields) {
      expect(meta.fieldDefinition.safeParse(field).success).toBe(true)
    }
  })

  test("an unknown kind or an unknown key is refused", () => {
    expect(meta.fieldDefinition.safeParse({ tipo: "cadena" }).success).toBe(
      false
    )
    expect(
      meta.fieldDefinition.safeParse({ tipo: "texto", obligatorio: true })
        .success
    ).toBe(false)
  })

  test("an enum needs at least one value", () => {
    expect(
      meta.fieldDefinition.safeParse({ tipo: "enum", valores: [] }).success
    ).toBe(false)
  })

  test("with typeIds, a ref must name one of them, also inside a list", () => {
    expect(
      metaWithTypes.fieldDefinition.safeParse({ tipo: "ref", a: "centros" })
        .success
    ).toBe(true)
    expect(
      metaWithTypes.fieldDefinition.safeParse({
        tipo: "lista",
        de: { tipo: "ref", a: "personas" },
      }).success
    ).toBe(false)
  })

  test("an object needs at least one field", () => {
    const result = meta.fieldDefinition.safeParse({
      tipo: "objeto",
      campos: {},
    })
    expect(messages(result)).toContain("Declara al menos un campo")
  })
})

describe("typeDefinition", () => {
  const type = {
    nombre: "Máquina",
    plural: "Máquinas",
    etiqueta: "nombre",
    campos: { nombre: { tipo: "texto" }, ip: { tipo: "ip" } },
    vista: { columnas: ["id", "nombre", "ip", "actualizado"] },
  }

  test("accepts a type whose label and columns are its fields, id or reserved fields", () => {
    expect(meta.typeDefinition.safeParse(type).success).toBe(true)
  })

  test("a label or a column that is not a field is refused with its path", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      etiqueta: "hostname",
      vista: { columnas: ["ip", "uso"] },
    })
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["etiqueta"],
      ["vista", "columnas", 1],
    ])
  })

  test("the reserved entity fields cannot be declared", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      campos: { ...type.campos, fuente: { tipo: "texto" } },
    })
    expect(messages(result)).toEqual([
      "`fuente` no se puede declarar: toda entidad lo admite sin declararlo",
    ])
  })

  test("a field name with capitals or accents is refused", () => {
    const result = meta.typeDefinition.safeParse({
      ...type,
      campos: { Ubicación: { tipo: "texto" } },
    })
    expect(result.success).toBe(false)
  })
})

describe("siteConfig", () => {
  test("accepts a site with extra header fields", () => {
    const result = meta.siteConfig.safeParse({
      nombre: "Homelab",
      plataforma: "1",
      cabecera: { pendientes: { tipo: "lista", de: { tipo: "texto" } } },
    })
    expect(result.success).toBe(true)
  })

  test("the platform version is a quoted known major", () => {
    const result = meta.siteConfig.safeParse({
      nombre: "Homelab",
      plataforma: 1,
    })
    expect(messages(result)).toEqual([
      '`plataforma` es la versión del contrato, entre comillas: "1"',
    ])
  })

  test("the common page header fields cannot be redeclared", () => {
    const result = meta.siteConfig.safeParse({
      nombre: "Homelab",
      plataforma: "1",
      cabecera: { titulo: { tipo: "texto" } },
    })
    expect(messages(result)).toEqual([
      "`titulo` no se puede declarar: toda ficha lo tiene sin declararlo",
    ])
  })
})
