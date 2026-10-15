import { describe, expect, test } from "bun:test"
import { type CatalogIndex, entitySchema } from "#entity-schema"
import type { TypeDefinition } from "#meta-schema"

const index: CatalogIndex = {
  entityIds: new Map([
    ["ubicaciones", ["casa", "hetzner"]],
    ["vacio", []],
  ]),
  pagePaths: ["red", "red/dns"],
  folderPaths: ["red"],
}

const machine: TypeDefinition = {
  nombre: "Máquina",
  plural: "Máquinas",
  campos: {
    ip: { tipo: "ip" },
    ubicacion: { tipo: "ref", a: "ubicaciones" },
    clase: { tipo: "enum", valores: ["fisica", "vm"] },
    ficha: { tipo: "ficha", opcional: true },
    alta: { tipo: "fecha", opcional: true },
    discos: { tipo: "entero", opcional: true },
    contenedores: {
      tipo: "lista",
      opcional: true,
      de: {
        tipo: "objeto",
        campos: {
          nombre: { tipo: "texto" },
          puertos: { tipo: "lista", de: { tipo: "texto" }, opcional: true },
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
      contenedores: [{ nombre: "adguard", puertos: ["53:53/udp"] }],
      fuente: "komodo",
      actualizado: "2026-10-15",
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
        contenedores: [{ nombre: "x", imagen: "y" }],
      }).success
    ).toBe(false)
  })

  test("a ref to a type with no entities says there are none", () => {
    const empty = entitySchema(
      { ...machine, campos: { centro: { tipo: "ref", a: "vacio" } } },
      index
    )
    const result = empty.safeParse({ centro: "c11" })
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "No hay ninguna entidad en catalogo/vacio/",
    ])
  })
})
