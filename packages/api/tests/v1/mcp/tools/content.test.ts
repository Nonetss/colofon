import { describe, expect, test } from "bun:test"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import type {
  ContentRepositoryOutput,
  OwnRepositoryOutput,
} from "#v1/content/output"
import {
  addRepositoryTool,
  type ContentClient,
  type CredentialClient,
  myRepositoriesTool,
  syncTool,
} from "#v1/mcp/tools/content"

const origin = "https://docs.example.org"

const casa: ContentRepositoryOutput = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "casa",
  name: "Casa",
  url: "https://***@github.com/nonete/casa.git",
  credentialId: null,
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

const CREDENTIAL_ID = "00000000-0000-4000-8000-0000000000c1"

const apuntes: OwnRepositoryOutput = {
  id: "00000000-0000-4000-8000-000000000002",
  slug: "apuntes",
  name: "Apuntes",
  url: "https://git.example.com/org/docs",
  credentialId: CREDENTIAL_ID,
  ref: "main",
  path: "docs",
  lastSyncedAt: null,
  lastCommit: null,
  lastSyncError: null,
  createdAt: "2026-10-17T10:00:00.000Z",
  updatedAt: "2026-10-17T10:00:00.000Z",
}

type SavedCredentials = Awaited<ReturnType<CredentialClient["list"]>>

const anaCredential: SavedCredentials["credentials"][number] = {
  id: CREDENTIAL_ID,
  host: "git.example.com",
  username: "ana",
  inUse: true,
  unreadable: false,
  createdAt: "2026-10-17T09:00:00.000Z",
  updatedAt: "2026-10-17T09:00:00.000Z",
}

function notUsed(): never {
  throw new Error("not used")
}

type Fakes = {
  sync?: () => ContentRepositoryOutput
  listMine?: () => OwnRepositoryOutput[]
  create?: () => OwnRepositoryOutput
  saved?: SavedCredentials
}

/** Fake content and credential clients answering `fakes`, recording inputs. */
function clients(fakes: Fakes = {}) {
  const calls: unknown[] = []
  const created: unknown[] = []
  const content: ContentClient = {
    syncRepository: async (input) => {
      calls.push(input)
      if (fakes.sync === undefined) return notUsed()
      return fakes.sync()
    },
    listMyRepositories: async () => {
      if (fakes.listMine === undefined) return notUsed()
      return fakes.listMine()
    },
    createMyRepository: async (input) => {
      created.push(input)
      if (fakes.create === undefined) return notUsed()
      return fakes.create()
    },
  }
  const credentials: CredentialClient = {
    list: async () => {
      if (fakes.saved === undefined) return notUsed()
      return fakes.saved
    },
  }
  return { content, credentials, calls, created }
}

function client(outcome: () => ContentRepositoryOutput) {
  return clients({ sync: outcome })
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

describe("myRepositoriesTool", () => {
  test("lists the repositories with their credential and the saved credentials, never a token", async () => {
    const { content, credentials } = clients({
      listMine: () => [apuntes],
      saved: { enabled: true, credentials: [anaCredential] },
    })

    const result = await myRepositoriesTool({ content, credentials, origin })

    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe(
      [
        "## Apuntes (apuntes)",
        "",
        "- URL: https://git.example.com/org/docs",
        "- Ref: main",
        "- Folder: docs",
        "- Credential: git.example.com / ana",
        "- Last sync: not synced yet",
        "- Read it at https://docs.example.org/apuntes",
        "",
        "## Saved git credentials",
        "",
        "Pass the username as credential to add_repository for a URL on that host.",
        "",
        "- git.example.com / ana",
        "",
        "New credentials are saved at https://docs.example.org/me/repositories.",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      repositories: [
        {
          slug: "apuntes",
          name: "Apuntes",
          url: "https://git.example.com/org/docs",
          ref: "main",
          path: "docs",
          credential: { host: "git.example.com", username: "ana" },
          lastSyncedAt: null,
          lastCommit: null,
          lastSyncError: null,
          address: "https://docs.example.org/apuntes",
        },
      ],
      credentialsEnabled: true,
      credentials: [
        { host: "git.example.com", username: "ana", unreadable: false },
      ],
    })
  })

  test("shows a failed sync with git's error and a synced one with its commit", async () => {
    const { content, credentials } = clients({
      listMine: () => [
        { ...apuntes, credentialId: null, lastSyncError: "fatal: no ref" },
        {
          ...apuntes,
          slug: "notas",
          name: "Notas",
          credentialId: null,
          lastSyncedAt: "2026-10-17T11:00:00.000Z",
          lastCommit: "abc1234",
        },
      ],
      saved: { enabled: true, credentials: [] },
    })

    const result = text(
      await myRepositoriesTool({ content, credentials, origin })
    )

    expect(result).toContain("- Credential: none")
    expect(result).toContain("- Last sync: failed: fatal: no ref")
    expect(result).toContain(
      "- Last sync: 2026-10-17T11:00:00.000Z, commit abc1234"
    )
    expect(result).toContain("You have no saved git credentials.")
  })

  test("without repositories, points to add_repository", async () => {
    const { content, credentials } = clients({
      listMine: () => [],
      saved: { enabled: true, credentials: [] },
    })

    const result = text(
      await myRepositoriesTool({ content, credentials, origin })
    )

    expect(result).toContain(
      "You have no repositories of your own. add_repository adds one."
    )
  })

  test("says so when the server can't store credentials", async () => {
    const { content, credentials } = clients({
      listMine: () => [],
      saved: { enabled: false, credentials: [] },
    })

    const result = await myRepositoriesTool({ content, credentials, origin })

    expect(text(result)).toContain("can't store git credentials")
    expect(result.structuredContent).toMatchObject({
      credentialsEnabled: false,
      credentials: [],
    })
  })

  test("marks an unreadable credential", async () => {
    const { content, credentials } = clients({
      listMine: () => [],
      saved: {
        enabled: true,
        credentials: [{ ...anaCredential, unreadable: true }],
      },
    })

    const result = text(
      await myRepositoriesTool({ content, credentials, origin })
    )

    expect(result).toContain("- git.example.com / ana (unusable:")
  })
})

describe("addRepositoryTool", () => {
  const publicInput = {
    slug: "apuntes",
    name: "Apuntes",
    url: "https://github.com/ana/apuntes.git",
    ref: "main",
    path: "",
  }

  test("adds a public repository and says its sync started", async () => {
    const { content, credentials, created } = clients({
      create: () => ({ ...apuntes, credentialId: null, path: "" }),
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: publicInput,
    })

    expect(created).toEqual([{ ...publicInput, credentialId: undefined }])
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe(
      [
        "Added Apuntes (apuntes) at main.",
        "- Folder: the root",
        "- Credential: none",
        "- Read it at https://docs.example.org/apuntes",
        "",
        'Its first sync has started. Call sync with repository "apuntes" to wait for it, or my_repositories to see how it went.',
      ].join("\n")
    )
  })

  test("resolves the credential by the URL's host and its username", async () => {
    const { content, credentials, created } = clients({
      create: () => apuntes,
      saved: {
        enabled: true,
        credentials: [
          { ...anaCredential, id: "other", host: "other.example.com" },
          anaCredential,
        ],
      },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: {
        ...publicInput,
        url: "https://git.example.com/org/docs",
        path: "docs",
        credential: "ana",
      },
    })

    expect(created).toEqual([
      {
        slug: "apuntes",
        name: "Apuntes",
        url: "https://git.example.com/org/docs",
        ref: "main",
        path: "docs",
        credentialId: CREDENTIAL_ID,
      },
    ])
    expect(text(result)).toContain("- Credential: git.example.com / ana")
  })

  test("no credential for the URL's host is an error pointing to my_repositories", async () => {
    const { content, credentials, created } = clients({
      saved: { enabled: true, credentials: [anaCredential] },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: {
        ...publicInput,
        url: "https://other.example.com/org/docs",
        credential: "ana",
      },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Call my_repositories")
    expect(created).toEqual([])
  })

  test("a credential while the server can't store them is an error", async () => {
    const { content, credentials, created } = clients({
      saved: { enabled: false, credentials: [] },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: { ...publicInput, credential: "ana" },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toContain("can't store git credentials")
    expect(created).toEqual([])
  })

  test("a URL with a token is refused without storing or echoing it", async () => {
    const { content, credentials, created } = clients()

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: {
        ...publicInput,
        url: "https://ana:secreto@git.example.com/org/docs",
      },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toContain(
      "Save the token as a git credential at https://docs.example.org/me/repositories"
    )
    expect(text(result)).not.toContain("secreto")
    expect(created).toEqual([])
  })

  test("a slug in use is an error saying to choose another", async () => {
    const { content, credentials } = clients({
      create: () => {
        throw new ORPCError("CONFLICT", { message: "Ese slug ya existe" })
      },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: { ...publicInput, slug: "casa" },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toBe('The slug "casa" is in use. Choose another.')
  })

  test("a validation failure lists the procedure's messages with their fields", async () => {
    const { content, credentials } = clients({
      create: () => {
        throw new ORPCError("BAD_REQUEST", {
          message: "Input validation failed",
          data: {
            issues: [
              {
                path: ["url"],
                message:
                  "Esa dirección no está permitida: usa una URL https pública",
              },
            ],
          },
        })
      },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: { ...publicInput, url: "https://10.0.0.5/org/docs" },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      "The repository was not added: url: Esa dirección no está permitida: usa una URL https pública"
    )
  })

  test("a bad request without issues gives its message", async () => {
    const { content, credentials } = clients({
      create: () => {
        throw new ORPCError("BAD_REQUEST", {
          message: "La credencial es de otro servidor",
        })
      },
    })

    const result = await addRepositoryTool({
      content,
      credentials,
      origin,
      input: publicInput,
    })

    expect(text(result)).toBe(
      "The repository was not added: La credencial es de otro servidor"
    )
  })

  test("any other error is rethrown", async () => {
    const { content, credentials } = clients({
      create: () => {
        throw new ORPCError("INTERNAL_SERVER_ERROR")
      },
    })

    await expect(
      addRepositoryTool({ content, credentials, origin, input: publicInput })
    ).rejects.toThrow()
  })
})
