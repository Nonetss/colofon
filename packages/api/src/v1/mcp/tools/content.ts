import type { CallToolResult } from "@modelcontextprotocol/server"
import { hostOf } from "@nonete/content"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import type { AppRouterClient } from "#router"
import { contentInput } from "#v1/content/input"
import type { OwnRepositoryOutput } from "#v1/content/output"

// The MCP's content tools, served to every user. They go through the
// `v1.content` and `v1.gitCredential` procedures as the caller, like the
// profile page and the reader's sync, so the procedures' own owner and remote
// checks apply. No token travels through them: `add_repository` names a saved
// credential by its username and refuses a URL that carries one.

/** The `v1.content` procedures the content tools call. */
export type ContentClient = Pick<
  AppRouterClient["v1"]["content"],
  "syncRepository" | "listMyRepositories" | "createMyRepository"
>

/** The `v1.gitCredential` procedure that names the saved credentials. */
export type CredentialClient = Pick<
  AppRouterClient["v1"]["gitCredential"],
  "list"
>

export type ContentToolScope = {
  content: ContentClient
  credentials: CredentialClient
  origin: string
}

export const syncInput = z.object({
  repository: contentInput.syncRepository.shape.slug,
})

const createInput = contentInput.createMyRepository

export const addRepositoryInput = createInput
  .omit({ credentialId: true })
  .extend({
    url: createInput.shape.url.describe(
      "HTTPS URL of the git repository, without credentials (https://host/owner/repo.git); a private one clones with a saved credential"
    ),
    credential: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "Username of one of the user's saved git credentials for the URL's host, as my_repositories lists them; omit it for a public repository"
      ),
  })

const listedCredential = z.object({
  host: z.string(),
  username: z.string(),
})

/** What `my_repositories` returns as structured content. */
export const myRepositoriesOutput = z.object({
  repositories: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      url: z.string(),
      ref: z.string(),
      path: z.string(),
      credential: listedCredential.nullable(),
      lastSyncedAt: z.string().nullable(),
      lastCommit: z.string().nullable(),
      lastSyncError: z.string().nullable(),
      address: z.string(),
    })
  ),
  credentialsEnabled: z.boolean(),
  credentials: z.array(listedCredential.extend({ unreadable: z.boolean() })),
})

type SavedCredential = Awaited<
  ReturnType<CredentialClient["list"]>
>["credentials"][number]

type MyRepository = z.infer<typeof myRepositoriesOutput>["repositories"][number]

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] }
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true }
}

function profileUrl(origin: string): string {
  return `${origin}/me/repositories`
}

const CREDENTIALS_OFF =
  "This server can't store git credentials, so only public repositories can be added."

/** `sync`: fetch one repository now and check out its ref. */
export async function syncTool({
  content,
  origin,
  input,
}: Pick<ContentToolScope, "content" | "origin"> & {
  input: z.infer<typeof syncInput>
}): Promise<CallToolResult> {
  try {
    const synced = await content.syncRepository({ slug: input.repository })
    const lines = [
      `Synced ${synced.name} (${synced.slug}) at ${synced.ref}.`,
      `- Commit: ${synced.lastCommit}`,
      `- Synced at: ${synced.lastSyncedAt}`,
      `- Read it at ${origin}/${synced.slug}`,
    ]
    return textResult(lines.join("\n"))
  } catch (error) {
    if (!(error instanceof ORPCError)) throw error
    if (error.code === "NOT_FOUND") {
      return errorResult(
        `No repository "${input.repository}". Call repositories to list the valid slugs.`
      )
    }
    if (error.code === "BAD_GATEWAY") {
      return errorResult(
        `Syncing "${input.repository}" failed: ${error.message}`
      )
    }
    throw error
  }
}

function folderText(path: string): string {
  if (path === "") return "the root"
  return path
}

function credentialText(
  credential: z.infer<typeof listedCredential> | null
): string {
  if (credential === null) return "none"
  return `${credential.host} / ${credential.username}`
}

function syncText(repository: MyRepository): string {
  if (repository.lastSyncError !== null)
    return `failed: ${repository.lastSyncError}`
  if (repository.lastSyncedAt === null) return "not synced yet"
  if (repository.lastCommit === null) return repository.lastSyncedAt
  return `${repository.lastSyncedAt}, commit ${repository.lastCommit}`
}

function repositoryBlock(repository: MyRepository): string[] {
  return [
    `## ${repository.name} (${repository.slug})`,
    "",
    `- URL: ${repository.url}`,
    `- Ref: ${repository.ref}`,
    `- Folder: ${folderText(repository.path)}`,
    `- Credential: ${credentialText(repository.credential)}`,
    `- Last sync: ${syncText(repository)}`,
    `- Read it at ${repository.address}`,
  ]
}

function credentialLine(credential: SavedCredential): string {
  const line = `- ${credential.host} / ${credential.username}`
  if (!credential.unreadable) return line
  return `${line} (unusable: its token can't be decrypted; its owner must save it again)`
}

function credentialsBlock(
  enabled: boolean,
  credentials: SavedCredential[],
  origin: string
): string[] {
  if (!enabled) return [CREDENTIALS_OFF]
  const save = `New credentials are saved at ${profileUrl(origin)}.`
  if (credentials.length === 0)
    return ["You have no saved git credentials.", save]
  return [
    "## Saved git credentials",
    "",
    "Pass the username as credential to add_repository for a URL on that host.",
    "",
    ...credentials.map(credentialLine),
    "",
    save,
  ]
}

function myRepository(
  repository: OwnRepositoryOutput,
  credentials: SavedCredential[],
  origin: string
): MyRepository {
  const credential = credentials.find(
    (saved) => saved.id === repository.credentialId
  )
  return {
    slug: repository.slug,
    name: repository.name,
    url: repository.url,
    ref: repository.ref,
    path: repository.path,
    credential: listedOf(credential),
    lastSyncedAt: repository.lastSyncedAt,
    lastCommit: repository.lastCommit,
    lastSyncError: repository.lastSyncError,
    address: `${origin}/${repository.slug}`,
  }
}

function listedOf(
  credential: SavedCredential | undefined
): z.infer<typeof listedCredential> | null {
  if (credential === undefined) return null
  return { host: credential.host, username: credential.username }
}

/** `my_repositories`: the caller's own repositories and saved credentials. */
export async function myRepositoriesTool({
  content,
  credentials,
  origin,
}: ContentToolScope): Promise<CallToolResult> {
  const [owned, saved] = await Promise.all([
    content.listMyRepositories(),
    credentials.list(),
  ])
  const repositories = owned.map((repository) =>
    myRepository(repository, saved.credentials, origin)
  )
  const structuredContent = {
    repositories,
    credentialsEnabled: saved.enabled,
    credentials: saved.credentials.map((credential) => ({
      host: credential.host,
      username: credential.username,
      unreadable: credential.unreadable,
    })),
  } satisfies z.infer<typeof myRepositoriesOutput>
  const repositoryLines = repositories.flatMap((repository) => [
    ...repositoryBlock(repository),
    "",
  ])
  if (repositories.length === 0) {
    repositoryLines.push(
      "You have no repositories of your own. add_repository adds one.",
      ""
    )
  }
  const text = [
    ...repositoryLines,
    ...credentialsBlock(saved.enabled, saved.credentials, origin),
  ].join("\n")
  return { ...textResult(text), structuredContent }
}

/** Whether `url` carries a username or a password. */
function carriesCredentials(url: string): boolean {
  const parsed = URL.parse(url)
  if (parsed === null) return false
  return parsed.username !== "" || parsed.password !== ""
}

type CredentialChoice =
  | { ok: true; credential: SavedCredential | undefined }
  | { ok: false; message: string }

/** The caller's credential for `url`'s host named `username`, if one is asked. */
async function chooseCredential(
  credentials: CredentialClient,
  url: string,
  username: string | undefined,
  origin: string
): Promise<CredentialChoice> {
  if (username === undefined) return { ok: true, credential: undefined }
  const saved = await credentials.list()
  if (!saved.enabled) return { ok: false, message: CREDENTIALS_OFF }
  const host = hostOf(url)
  const credential = saved.credentials.find(
    (candidate) => candidate.host === host && candidate.username === username
  )
  if (credential === undefined) {
    return {
      ok: false,
      message: `You have no saved git credential for ${host} with the username "${username}". Call my_repositories to list the saved credentials; new ones are saved at ${profileUrl(origin)}.`,
    }
  }
  return { ok: true, credential }
}

const validationData = z.object({
  issues: z.array(
    z.object({
      message: z.string(),
      path: z.array(z.union([z.string(), z.number()])).optional(),
    })
  ),
})

function issueText(issue: z.infer<typeof validationData>["issues"][number]) {
  const path = (issue.path ?? []).join(".")
  if (path === "") return issue.message
  return `${path}: ${issue.message}`
}

/** The validation messages of a `BAD_REQUEST`, or its message. */
function badRequestText(error: ORPCError<string, unknown>): string {
  const parsed = validationData.safeParse(error.data)
  if (!parsed.success) return error.message
  return parsed.data.issues.map(issueText).join("; ")
}

/** The tool error for a refused create, or null to rethrow it. */
function createRefusal(
  error: ORPCError<string, unknown>,
  slug: string
): string | null {
  if (error.code === "CONFLICT")
    return `The slug "${slug}" is in use. Choose another.`
  if (error.code === "BAD_REQUEST")
    return `The repository was not added: ${badRequestText(error)}`
  if (error.code === "NOT_FOUND")
    return "That credential no longer exists. Call my_repositories to list the saved credentials."
  if (error.code === "SERVICE_UNAVAILABLE") return CREDENTIALS_OFF
  return null
}

/** `add_repository`: store one external repository as the caller's. */
export async function addRepositoryTool({
  content,
  credentials,
  origin,
  input,
}: ContentToolScope & {
  input: z.infer<typeof addRepositoryInput>
}): Promise<CallToolResult> {
  if (carriesCredentials(input.url)) {
    return errorResult(
      `The URL can't carry a username or token. Save the token as a git credential at ${profileUrl(origin)}, then pass its username as credential with the URL without credentials.`
    )
  }
  const choice = await chooseCredential(
    credentials,
    input.url,
    input.credential,
    origin
  )
  if (!choice.ok) return errorResult(choice.message)

  try {
    const created = await content.createMyRepository({
      slug: input.slug,
      name: input.name,
      url: input.url,
      ref: input.ref,
      path: input.path,
      credentialId: choice.credential?.id,
    })
    const lines = [
      `Added ${created.name} (${created.slug}) at ${created.ref}.`,
      `- Folder: ${folderText(created.path)}`,
      `- Credential: ${credentialText(listedOf(choice.credential))}`,
      `- Read it at ${origin}/${created.slug}`,
      "",
      `Its first sync has started. Call sync with repository "${created.slug}" to wait for it, or my_repositories to see how it went.`,
    ]
    return textResult(lines.join("\n"))
  } catch (error) {
    if (!(error instanceof ORPCError)) throw error
    const refusal = createRefusal(error, input.slug)
    if (refusal === null) throw error
    return errorResult(refusal)
  }
}
