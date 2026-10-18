import { beforeEach, describe, expect, test } from "bun:test"
import {
  highlightRanges,
  rememberSearchHighlight,
  searchTerms,
  takeSearchHighlight,
} from "@/lib/search-highlight"

beforeEach(() => {
  sessionStorage.clear()
})

/** The words of `text` that `highlightRanges` marks. */
function marked(text: string, terms: string[]): string[] {
  return highlightRanges(text, terms).map(({ start, end }) =>
    text.slice(start, end)
  )
}

describe("searchTerms", () => {
  test("folds the typed words and drops punctuation", () => {
    expect(searchTerms("  Resolución, DNS! ")).toEqual(["resolucion", "dns"])
    expect(searchTerms(" ¿? ")).toEqual([])
  })
})

describe("highlightRanges", () => {
  test("marks words starting with a term, case and accents aside", () => {
    expect(
      marked("La Resolución inversa y la resolucion directa", ["resol"])
    ).toEqual(["Resolución", "resolucion"])
  })

  test("only matches at the start of a word", () => {
    expect(marked("irresoluble resolver", ["resol"])).toEqual(["resolver"])
  })

  test("marks the words of every term, in text order", () => {
    expect(marked("El router reparte la vlan", ["vlan", "router"])).toEqual([
      "router",
      "vlan",
    ])
  })

  test("marks nothing without terms", () => {
    expect(highlightRanges("texto", [])).toEqual([])
  })
})

describe("search highlight handoff", () => {
  test("the opened page takes its terms once", () => {
    rememberSearchHighlight("/casa/red/dns#resolución-inversa", ["inversa"])
    expect(
      takeSearchHighlight("/casa/red/dns#resoluci%C3%B3n-inversa")
    ).toEqual(["inversa"])
    expect(takeSearchHighlight("/casa/red/dns#resolución-inversa")).toEqual([])
  })

  test("another page gets nothing, and the stored terms are dropped", () => {
    rememberSearchHighlight("/casa/red/dns", ["dns"])
    expect(takeSearchHighlight("/casa/red/vlan")).toEqual([])
    expect(takeSearchHighlight("/casa/red/dns")).toEqual([])
  })

  test("malformed storage gives nothing", () => {
    sessionStorage.setItem("search-highlight", "{not json")
    expect(takeSearchHighlight("/casa")).toEqual([])
    sessionStorage.setItem(
      "search-highlight",
      JSON.stringify({ href: "/casa" })
    )
    expect(takeSearchHighlight("/casa")).toEqual([])
  })
})
