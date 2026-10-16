import { describe, expect, test } from "bun:test"
import { CENTRE, RADIUS } from "#diagrams/types/radar"
import {
  cleanDiagramOf,
  diagramOf,
  problemsOf,
  textOf,
} from "#tests/diagrams/types/helpers"

const SPEC = {
  type: "radar",
  axes: ["Latencia", "Coste", "Escala"],
  max: 5,
  series: [
    { name: "MinIO", values: [5, 4, 3], focal: true },
    { name: "Ceph", values: [3, 3, 5] },
  ],
}

describe("radar", () => {
  test("each series is a polygon, the focal one in the accent with its vertices dotted", () => {
    const diagram = cleanDiagramOf(SPEC)
    const polygons = diagram.over.filter(
      (graphic) => graphic.kind === "polygon"
    )
    expect(polygons.map((graphic) => graphic.datum?.series)).toEqual([
      "Ceph",
      "MinIO",
    ])
    expect(polygons[1]?.classes).toContain("fill-accent")
    const dots = diagram.over.filter((graphic) => graphic.kind === "circle")
    expect(dots).toHaveLength(3)
    const top = polygons[1]
    if (top === undefined || top.kind !== "polygon") throw new Error("none")
    expect(top.points[0]).toEqual([CENTRE.x, CENTRE.y - RADIUS])
  })

  test("a value above the scale is reported and drawn at its top", () => {
    const spec = {
      ...SPEC,
      series: [{ name: "Ceph", values: [7, 3, 5] }],
    }
    expect(problemsOf(spec)).toEqual([
      "series.0.values.0: 7 está por encima de max (5): se dibuja en 5",
    ])
    const polygon = diagramOf(spec).over.find(
      (graphic) => graphic.kind === "polygon"
    )
    if (polygon === undefined || polygon.kind !== "polygon")
      throw new Error("none")
    expect(polygon.points[0]).toEqual([CENTRE.x, CENTRE.y - RADIUS])
  })

  test("a series with another count of values is reported and left out", () => {
    const spec = { ...SPEC, series: [{ name: "Ceph", values: [1, 2] }] }
    expect(problemsOf(spec)).toEqual([
      'series.0.values: "Ceph" tiene 2 valores y hay 3 ejes',
    ])
    expect(
      diagramOf(spec).over.filter((graphic) => graphic.kind === "polygon")
    ).toEqual([])
  })

  test("more than 6 axes is over budget, fewer than 3 is refused", () => {
    const axes = ["a", "b", "c", "d", "e", "f", "g"]
    expect(
      problemsOf({
        ...SPEC,
        axes,
        series: [{ name: "x", values: axes.map(() => 1) }],
      })
    ).toEqual([
      "Un radar lleva como mucho 6 ejes y este tiene 7: pártelo en dos diagramas",
    ])
    expect(problemsOf({ ...SPEC, axes: ["a", "b"] })).toContain(
      "axes: Un radar lleva al menos 3 ejes"
    )
  })

  test("its text version is a table of the series", () => {
    expect(textOf(cleanDiagramOf(SPEC))).toContain(
      "<tr><td>MinIO</td><td>5</td><td>4</td><td>3</td></tr>"
    )
  })
})
