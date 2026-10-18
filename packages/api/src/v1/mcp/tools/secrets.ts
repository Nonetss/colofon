import type { CallToolResult } from "@modelcontextprotocol/server"
import { z } from "zod"
import type { AppRouterClient } from "#router"
import type { RequestResult } from "#v1/secret/request/execute"
import type { RequestInput } from "#v1/secret/request/plan"
import type { ResponseBody } from "#v1/secret/request/send"

// The MCP's secrets tools. `secrets` reads through `v1.secret.list` as the
// caller, like every other tool. `request` runs the executor bound to the
// caller (`v1/secret/request/execute.ts`): it has no procedure, because the
// MCP is its only consumer (design of `add-mcp-secrets`, §4).

/** What the secrets tools get: the caller's list and their bound executor. */
export type SecretsAccess = {
  list: AppRouterClient["v1"]["secret"]["list"]
  request: (input: RequestInput) => Promise<RequestResult>
}

export type SecretToolScope = {
  secrets: SecretsAccess
  origin: string
}

/** What `secrets` returns as structured content. */
export const secretsOutput = z.object({
  secrets: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      fields: z.array(z.string()),
      placeholders: z.array(z.string()),
      origins: z.array(z.string()),
      allowWrite: z.boolean(),
      allowInUrl: z.boolean(),
      allowInBody: z.boolean(),
      unreadable: z.boolean(),
    })
  ),
})

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] }
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true }
}

type ListedSecret = Awaited<
  ReturnType<SecretsAccess["list"]>
>["secrets"][number]

function placeholdersOf(secret: ListedSecret): string[] {
  return secret.fields.map((field) => `{{${secret.name}.${field}}}`)
}

function placesOf(secret: ListedSecret): string {
  const places = ["headers"]
  if (secret.allowInUrl) places.push("the URL")
  if (secret.allowInBody) places.push("the body")
  return places.join(", ")
}

function secretBlock(secret: ListedSecret): string[] {
  const methods = secret.allowWrite
    ? "every method"
    : "reading methods only (GET, HEAD, OPTIONS)"
  const lines = [`## ${secret.name}`, ""]
  if (secret.description !== null) lines.push(secret.description, "")
  lines.push(
    `- Placeholders: ${placeholdersOf(secret).join(", ")}`,
    `- Origins: ${secret.origins.join(", ")}`,
    `- Methods: ${methods}`,
    `- Placeholders allowed in: ${placesOf(secret)}`
  )
  if (secret.unreadable) {
    lines.push(
      "- Unusable: its values can't be decrypted; its owner must save them again on /me/secrets"
    )
  }
  return lines
}

/** `secrets`: the caller's secrets, by name, never their values. */
export async function secretsTool({
  secrets,
  origin,
}: SecretToolScope): Promise<CallToolResult> {
  const { secrets: listed } = await secrets.list()
  const structured = listed.map((secret) => ({
    name: secret.name,
    description: secret.description,
    fields: secret.fields,
    placeholders: placeholdersOf(secret),
    origins: secret.origins,
    allowWrite: secret.allowWrite,
    allowInUrl: secret.allowInUrl,
    allowInBody: secret.allowInBody,
    unreadable: secret.unreadable,
  }))
  if (listed.length === 0) {
    return {
      ...textResult(
        `You have no secrets. Their owner creates them on ${origin}/me/secrets.`
      ),
      structuredContent: { secrets: structured },
    }
  }
  const text = [
    ...listed.flatMap((secret) => [...secretBlock(secret), ""]),
    "Use the placeholders in a request; the platform fills in the values and masks them in the response.",
  ].join("\n")
  return { ...textResult(text), structuredContent: { secrets: structured } }
}

/** `bytes` for a person: bytes, KB or MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const megabytes = bytes / (1024 * 1024)
  if (Number.isInteger(megabytes)) return `${megabytes} MB`
  return `${megabytes.toFixed(1)} MB`
}

function sizeOf(size: number, complete: boolean): string {
  if (complete) return formatBytes(size)
  return `more than ${formatBytes(size)}`
}

function bodyLines(body: ResponseBody): string[] {
  if (body.kind === "none") return ["[No body]"]
  if (body.kind === "binary") {
    const type = body.contentType === "" ? "unknown type" : body.contentType
    return [
      `[Binary body not shown: ${type}, ${sizeOf(body.size, body.complete)}]`,
    ]
  }
  const lines = [body.text]
  if (body.truncated) {
    lines.push(
      "",
      `[Body truncated: showing the first ${formatBytes(Buffer.byteLength(body.text))} of ${sizeOf(body.size, body.complete)}]`
    )
  } else if (!body.complete) {
    lines.push("", "[Body incomplete: the request ran out of time]")
  }
  return lines
}

/** `request`: one HTTP request with the caller's secrets, response masked. */
export async function requestTool({
  secrets,
  input,
}: SecretToolScope & { input: RequestInput }): Promise<CallToolResult> {
  const result = await secrets.request(input)
  if (!result.ok) return errorResult(result.message)
  const { response } = result
  const statusLine = `HTTP ${response.status} ${response.statusText}`.trimEnd()
  const headers = response.headers.map(([name, value]) => `${name}: ${value}`)
  return textResult(
    [statusLine, ...headers, "", ...bodyLines(response.body)].join("\n")
  )
}
