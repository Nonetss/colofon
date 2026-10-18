import { describe, expect, test } from "bun:test"
import { type CatalogIndex, entitySchema } from "#contract/schema/entity-schema"
import type { TypeDefinition } from "#contract/schema/meta-schema"

const index: CatalogIndex = {
  entityIds: new Map([
    ["ubicaciones", ["casa", "hetzner"]],
    ["vacio", []],
  ]),
  pagePaths: ["red", "red/dns"],
  folderPaths: ["red"],
}

const machine: TypeDefinition = {
  name: "Máquina",
  plural: "Máquinas",
  fields: {
    ip: { type: "ip" },
    ubicacion: { type: "ref", to: "ubicaciones" },
    clase: { type: "enum", values: ["fisica", "vm"] },
    ficha: { type: "page", optional: true },
    alta: { type: "date", optional: true },
    discos: { type: "integer", optional: true },
    contenedores: {
      type: "list",
      optional: true,
      of: {
        type: "object",
        fields: {
          name: { type: "text" },
          puertos: { type: "list", of: { type: "text" }, optional: true },
        },
      },
    },
  },
}

const schema = entitySchema(machine, index)
const valid = { ip: "192.168.1.10", ubicacion: "casa", clase: "vm" }

describe("entitySchema", () => {
  test("accepts an entity with only its required fields", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  test("accepts optional, nested and reserved fields", () => {
    const result = schema.safeParse({
      ...valid,
      ficha: "red/dns",
      alta: "2026-10-15",
      discos: 2,
      contenedores: [{ name: "adguard", puertos: ["53:53/udp"] }],
      source: "komodo",
      updated: "2026-10-15",
    })
    expect(result.success).toBe(true)
  })

  test("a ref to an id that does not exist is refused", () => {
    expect(schema.safeParse({ ...valid, ubicacion: "oficina" }).success).toBe(
      false
    )
  })

  test("a ficha that is not a page of docs/ is refused", () => {
    expect(schema.safeParse({ ...valid, ficha: "red/vpn" }).success).toBe(false)
  })

  test("a missing required field or an undeclared one is refused", () => {
    const { ip: _ip, ...withoutIp } = valid
    expect(schema.safeParse(withoutIp).success).toBe(false)
    expect(schema.safeParse({ ...valid, so: "Debian" }).success).toBe(false)
  })

  test("values of the wrong format are refused", () => {
    expect(schema.safeParse({ ...valid, ip: "192.168.1" }).success).toBe(false)
    expect(schema.safeParse({ ...valid, alta: "15/10/2026" }).success).toBe(
      false
    )
    expect(schema.safeParse({ ...valid, discos: 1.5 }).success).toBe(false)
    expect(
      schema.safeParse({
        ...valid,
        contenedores: [{ name: "x", imagen: "y" }],
      }).success
    ).toBe(false)
  })

  test("a ref to a type with no entities says there are none", () => {
    const empty = entitySchema(
      { ...machine, fields: { centro: { type: "ref", to: "vacio" } } },
      index
    )
    const result = empty.safeParse({ centro: "c11" })
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "No hay ninguna entidad en catalog/vacio/",
    ])
  })
})
