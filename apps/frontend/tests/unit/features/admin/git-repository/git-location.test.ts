import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import { skipToken } from "@tanstack/react-query"
import {
  ancestorFolders,
  branchesInput,
  breadcrumb,
  EMPTY_LOCATION,
  fileInput,
  folderInput,
  formatBytes,
  hrefOf,
  isNotFound,
  lineCount,
  parentFolder,
  parseLocation,
  shownBranch,
  startingBranch,
  toggledFolder,
} from "@/features/admin/git-repository/model/git-location"

const listing = { branches: ["borrador", "main"], defaultBranch: "main" }

describe("parseLocation / hrefOf", () => {
  test("reads every part of the location, empty when missing", () => {
    expect(parseLocation("?path=docs%2Fred")).toEqual({
      branch: "",
      path: "docs/red",
      file: "",
    })
    expect(parseLocation("")).toEqual(EMPTY_LOCATION)
  })

  test("writes the location, leaving out empty parts and keeping other params", () => {
    const href = hrefOf(
      "https://docs.example/admin/git/manual?file=viejo&x=1",
      { branch: "main", path: "", file: "" }
    )
    const url = new URL(href)
    expect(url.pathname).toBe("/admin/git/manual")
    expect(url.searchParams.get("branch")).toBe("main")
    expect(url.searchParams.has("path")).toBe(false)
    expect(url.searchParams.has("file")).toBe(false)
    expect(url.searchParams.get("x")).toBe("1")
  })

  test("a written location reads back the same", () => {
    const location = {
      branch: "feature/nueva",
      path: "docs/red",
      file: "docs/red/dns.mdx",
    }
    expect(
      parseLocation(
        new URL(hrefOf("https://x/admin/git/manual", location)).search
      )
    ).toEqual(location)
  })
})

describe("startingBranch", () => {
  test("starts on the repository's ref when it is a branch", () => {
    expect(startingBranch("borrador", listing)).toBe("borrador")
  })

  test("else on HEAD's branch, else on the first, else nowhere", () => {
    expect(startingBranch("v1.0", listing)).toBe("main")
    expect(
      startingBranch("v1.0", { branches: ["b", "c"], defaultBranch: null })
    ).toBe("b")
    expect(
      startingBranch("main", { branches: [], defaultBranch: null })
    ).toBeUndefined()
  })
})

describe("shownBranch", () => {
  test("the URL's branch when the repository has it, else the starting one", () => {
    expect(shownBranch("borrador", "main", listing)).toBe("borrador")
    expect(shownBranch("borrada", "main", listing)).toBe("main")
    expect(shownBranch("", "main", listing)).toBe("main")
  })
})

describe("branchesInput / folderInput / fileInput", () => {
  const folder = { ...EMPTY_LOCATION, path: "docs" }
  const file = { ...folder, file: "docs/index.mdx" }

  test("nothing is read before there is a repository and a branch", () => {
    expect(branchesInput(undefined)).toBe(skipToken)
    expect(folderInput(undefined, "main", folder)).toBe(skipToken)
    expect(folderInput("manual", undefined, folder)).toBe(skipToken)
    expect(fileInput("manual", undefined, file)).toBe(skipToken)
  })

  test("a folder is listed while no file is open, a file read while one is", () => {
    expect(branchesInput({ slug: "manual" })).toEqual({ slug: "manual" })
    expect(folderInput("manual", "main", folder)).toEqual({
      slug: "manual",
      branch: "main",
      path: "docs",
    })
    expect(fileInput("manual", "main", folder)).toBe(skipToken)
    expect(folderInput("manual", "main", file)).toBe(skipToken)
    expect(fileInput("manual", "main", file)).toEqual({
      slug: "manual",
      branch: "main",
      path: "docs/index.mdx",
    })
  })
})

describe("breadcrumb / parentFolder", () => {
  test("the root alone at the root, then one crumb per folder", () => {
    expect(breadcrumb("manual", "")).toEqual([{ label: "manual", path: "" }])
    expect(breadcrumb("manual", "docs/red")).toEqual([
      { label: "manual", path: "" },
      { label: "docs", path: "docs" },
      { label: "red", path: "docs/red" },
    ])
  })

  test("a file's folder, the root for a file at the root", () => {
    expect(parentFolder("docs/red/dns.mdx")).toBe("docs/red")
    expect(parentFolder("doc.config.yaml")).toBe("")
  })
})

describe("ancestorFolders / toggledFolder", () => {
  test("every folder above a file, from the root down", () => {
    expect(ancestorFolders("docs/red/dns.mdx")).toEqual(["docs", "docs/red"])
    expect(ancestorFolders("doc.config.yaml")).toEqual([])
  })

  test("unfolds a folded folder and folds an unfolded one, as a new set", () => {
    const folders = new Set(["docs"])
    expect(toggledFolder(folders, "docs/red")).toEqual(
      new Set(["docs", "docs/red"])
    )
    expect(toggledFolder(folders, "docs")).toEqual(new Set())
    expect(folders).toEqual(new Set(["docs"]))
  })
})

describe("isNotFound / lineCount / formatBytes", () => {
  test("only the API's NOT_FOUND counts as not found", () => {
    expect(isNotFound(new ORPCError("NOT_FOUND"))).toBe(true)
    expect(isNotFound(new ORPCError("FORBIDDEN"))).toBe(false)
    expect(isNotFound(new Error("NOT_FOUND"))).toBe(false)
  })

  test("a final newline opens no new line", () => {
    expect(lineCount("")).toBe(0)
    expect(lineCount("a")).toBe(1)
    expect(lineCount("a\n")).toBe(1)
    expect(lineCount("a\nb")).toBe(2)
    expect(lineCount("a\n\n")).toBe(2)
  })

  test("sizes in bytes, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(3482)).toBe("3,4 KB")
    expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB")
  })
})
