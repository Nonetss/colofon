import { describe, expect, test } from "bun:test"
import { skipToken } from "@tanstack/react-query"
import {
  foldersInput,
  fromSelectValue,
  pathOptions,
  ROOT_LABEL,
  ROOT_VALUE,
  toSelectValue,
} from "@/features/content-repositories/manage/model/path-options"

describe("select values", () => {
  test("the root travels as a sentinel and comes back empty", () => {
    expect(toSelectValue("")).toBe(ROOT_VALUE)
    expect(fromSelectValue(ROOT_VALUE)).toBe("")
  })

  test("a folder is its own value", () => {
    expect(toSelectValue("docs")).toBe("docs")
    expect(fromSelectValue("docs")).toBe("docs")
  })
})

describe("pathOptions", () => {
  test("offers the folders found, the root labelled", () => {
    expect(pathOptions(["", "docs"], "docs")).toEqual([
      { value: ROOT_VALUE, label: ROOT_LABEL },
      { value: "docs", label: "docs" },
    ])
  })

  test("keeps a current folder the listing doesn't find, first", () => {
    expect(pathOptions(["docs"], "antiguo")).toEqual([
      { value: "antiguo", label: "antiguo" },
      { value: "docs", label: "docs" },
    ])
  })

  test("the root, the default of a new repository, is offered even when it holds no site", () => {
    expect(pathOptions(["docs"], "")).toEqual([
      { value: ROOT_VALUE, label: ROOT_LABEL },
      { value: "docs", label: "docs" },
    ])
  })
})

describe("foldersInput", () => {
  test("nothing is read until the form points at a repository", () => {
    expect(foldersInput(skipToken, "main")).toBe(skipToken)
  })

  test("the chosen ref travels with the repository", () => {
    expect(
      foldersInput({ url: "https://git.example/x.git" }, " main ")
    ).toEqual({ url: "https://git.example/x.git", ref: "main" })
    expect(foldersInput({ slug: "docs" }, "produccion")).toEqual({
      slug: "docs",
      ref: "produccion",
    })
  })

  test("an empty ref reads the remote's HEAD", () => {
    expect(foldersInput({ slug: "docs" }, "  ")).toEqual({ slug: "docs" })
  })
})
