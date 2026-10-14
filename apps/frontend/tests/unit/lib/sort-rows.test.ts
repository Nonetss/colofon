import { describe, expect, test } from "bun:test"
import { sortRows } from "@/lib/sort-rows"

type Host = { name: string; ip: string; location: string | null; ports: number }

const hosts: Host[] = [
  { name: "b", ip: "10.0.0.20", location: "Sala 2", ports: 24 },
  { name: "a", ip: "10.0.0.3", location: null, ports: 8 },
  { name: "c", ip: "10.0.0.100", location: "Sala 1", ports: 48 },
]

const values = {
  ip: (host: Host) => host.ip,
  location: (host: Host) => host.location,
  ports: (host: Host) => host.ports,
}

function names(rows: Host[]) {
  return rows.map((row) => row.name)
}

describe("sortRows", () => {
  test("no sorting keeps the input order", () => {
    expect(names(sortRows(hosts, [], values))).toEqual(["b", "a", "c"])
  })

  test("strings compare numerically", () => {
    expect(names(sortRows(hosts, [{ id: "ip", desc: false }], values))).toEqual(
      ["a", "b", "c"]
    )
  })

  test("descending reverses the order", () => {
    expect(
      names(sortRows(hosts, [{ id: "ports", desc: true }], values))
    ).toEqual(["c", "b", "a"])
  })

  test("rows without a value come last in both directions", () => {
    expect(
      names(sortRows(hosts, [{ id: "location", desc: false }], values))
    ).toEqual(["c", "b", "a"])
    expect(
      names(sortRows(hosts, [{ id: "location", desc: true }], values))
    ).toEqual(["b", "c", "a"])
  })

  test("a column without a value function leaves the order alone", () => {
    expect(
      names(sortRows(hosts, [{ id: "name", desc: true }], values))
    ).toEqual(["b", "a", "c"])
  })

  test("does not mutate its input", () => {
    const input = [...hosts]
    sortRows(input, [{ id: "ip", desc: true }], values)
    expect(input).toEqual(hosts)
  })
})
