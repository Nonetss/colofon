import { describe, expect, test } from "bun:test"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import type { ContentRepositoryOutput } from "#v1/content/output"
import { type ContentClient, syncTool } from "#v1/mcp/content-tools"

const origin = "https://docs.example.org"

const casa: ContentRepositoryOutput = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "casa",
  name: "Casa",
  url: "https://***@github.com/nonete/casa.git",
  hosted: false,
  pushUrl: null,
  ref: "main",
  path: "",
  catalogUrl: "https://docs.example.org/api/v1/content/casa/catalog.json",
  lastSyncedAt: "2026-10-16T10:00:00.000Z",
  lastCommit: "4f1c2a9",
  lastSyncError: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-10-16T10:00:00.000Z",
}

/** A content client whose sync answers `outcome`, recording each input. */
function client(outcome: () => ContentRepositoryOutput) {
  const calls: unknown[] = []
  const content: ContentClient = {
    syncRepository: async (input) => {
      calls.push(input)
      return outcome()
    },
  }
  return { content, calls }
}

function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

describe("syncTool", () => {
  test("syncs the repository by slug and says what was checked out", async () => {
    const { content, calls } = client(() => casa)

    const result = await syncTool({
      content,
      origin,
      input: { repository: "casa" },
    })

    expect(calls).toEqual([{ slug: "casa" }])
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe(
      [
        "Synced Casa (casa) at main.",
        "- Commit: 4f1c2a9",
        "- Synced at: 2026-10-16T10:00:00.000Z",
        "- Read it at https://docs.example.org/casa",
      ].join("\n")
    )
  })

  test("an unknown repository is a tool error pointing to repositories", async () => {
    const { content } = client(() => {
      throw new ORPCError("NOT_FOUND", { message: "Repositorio no encontrado" })
    })

    const result = await syncTool({
      content,
      origin,
      input: { repository: "nada" },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'No repository "nada". Call repositories to list the valid slugs.'
    )
  })

  test("a git failure is a tool error with git's message", async () => {
    const { content } = client(() => {
      throw new ORPCError("BAD_GATEWAY", {
        message: "fatal: couldn't find remote ref main",
      })
    })

    const result = await syncTool({
      content,
      origin,
      input: { repository: "casa" },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      `Syncing "casa" failed: fatal: couldn't find remote ref main`
    )
  })

  test("any other error is rethrown", async () => {
    const { content } = client(() => {
      throw new ORPCError("FORBIDDEN")
    })

    await expect(
      syncTool({ content, origin, input: { repository: "casa" } })
    ).rejects.toThrow()
  })
})
