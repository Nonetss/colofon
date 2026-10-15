import { describe, expect, test } from "bun:test"
import {
  compareKeys,
  detectKind,
  isEmptyCell,
  sortKey,
} from "@/features/docs/page/model/table-kinds"

function sorted(kind: Parameters<typeof sortKey>[0], texts: string[]) {
  return [...texts].sort((a, b) =>
    compareKeys(sortKey(kind, a), sortKey(kind, b))
  )
}

describe("detectKind", () => {
  test("reads IPs, dates, sizes, versions and numbers", () => {
    expect(detectKind(["192.168.1.10", "10.0.0.2/24", "172.16.0.1:8080"])).toBe(
      "ip"
    )
    expect(detectKind(["2026-10-15", "5/10/2026", "2026-01-02 10:30"])).toBe(
      "date"
    )
    expect(detectKind(["1.5 GB", "512 MiB", "≈ 2 TB"])).toBe("size")
    expect(detectKind(["1.2.3", "v2.1", "10.0.1"])).toBe("version")
    expect(detectKind(["3", "1.234,5", "12%"])).toBe("number")
    expect(detectKind(["Málaga", "Sevilla"])).toBe("text")
  })

  test("a column is its kind when 90 % of its non-empty cells read as it", () => {
    const ips = Array.from({ length: 9 }, (_, n) => `10.0.0.${n}`)
    expect(detectKind([...ips, "por definir", "", "—"])).toBe("ip")
    expect(detectKind([...ips.slice(0, 8), "nota", "otra"])).toBe("text")
  })

  test("a column without values is text", () => {
    expect(detectKind(["", "—", "n/a"])).toBe("text")
  })
})

describe("sorting by kind", () => {
  test("IPs by each number", () => {
    expect(sorted("ip", ["192.168.1.10", "192.168.1.9", "10.0.0.2"])).toEqual([
      "10.0.0.2",
      "192.168.1.9",
      "192.168.1.10",
    ])
  })

  test("dates by day, ISO and Spanish alike", () => {
    expect(sorted("date", ["5/10/2026", "2026-01-02", "2025-12-31"])).toEqual([
      "2025-12-31",
      "2026-01-02",
      "5/10/2026",
    ])
  })

  test("sizes by bytes", () => {
    expect(sorted("size", ["1 GB", "512 MiB", "2 TB", "900 KB"])).toEqual([
      "900 KB",
      "512 MiB",
      "1 GB",
      "2 TB",
    ])
  })

  test("versions by each part", () => {
    expect(sorted("version", ["1.10.0", "1.9.2", "v2.0"])).toEqual([
      "1.9.2",
      "1.10.0",
      "v2.0",
    ])
  })

  test("numbers in both notations", () => {
    expect(sorted("number", ["1.234,5", "99", "1000.5"])).toEqual([
      "99",
      "1000.5",
      "1.234,5",
    ])
  })

  test("text in Spanish collation, accents and case aside, numbers inside read as numbers", () => {
    expect(sorted("text", ["web-10", "Ávila", "web-2", "avellana"])).toEqual([
      "avellana",
      "Ávila",
      "web-2",
      "web-10",
    ])
  })

  test("empty cells go last, and cells not of the kind after the ones that are", () => {
    expect(sorted("ip", ["—", "nota", "10.0.0.1", ""])).toEqual([
      "10.0.0.1",
      "nota",
      "—",
      "",
    ])
    expect(isEmptyCell(" n/a ")).toBe(true)
  })
})
