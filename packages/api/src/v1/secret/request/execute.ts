import { db } from "@nonete/db"
import { type Secret, secret, secretUsage } from "@nonete/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { decryptValues, type SecretValues } from "#lib/cipher"
import { createMasker } from "#v1/secret/request/mask"
import {
  loggedUrl,
  planRequest,
  type RequestInput,
} from "#v1/secret/request/plan"
import {
  DEFAULT_SEND_OPTIONS,
  type ResponseBody,
  type SendOptions,
  send,
} from "#v1/secret/request/send"

// The MCP `request` tool's pipeline: load the caller's secrets, check and
// plan the request, decrypt only the secrets it uses, send it, mask every
// value used in the response, and record the call. Values exist decrypted
// only inside this function.

/** Who is calling: the request's user and the API key it came with. */
export type RequestCaller = { userId: string; apiKeyId: string | null }

/** The response as the agent sees it, every value used masked. */
export type MaskedResponse = {
  status: number
  statusText: string
  headers: [string, string][]
  body: ResponseBody
}

export type RequestResult =
  | { ok: true; response: MaskedResponse }
  | { ok: false; message: string }

type UsageRecord = {
  caller: RequestCaller
  secrets: Secret[]
  secretNames: string[]
  input: RequestInput
  outcome: "sent" | "refused" | "failed"
  status: number | null
  detail: string | null
  durationMs: number | null
}

async function recordUsage(record: UsageRecord): Promise<void> {
  await db.insert(secretUsage).values({
    userId: record.caller.userId,
    apiKeyId: record.caller.apiKeyId,
    secretIds: record.secrets.map((row) => row.id),
    secretNames: record.secretNames,
    method: record.input.method,
    url: loggedUrl(record.input.url),
    outcome: record.outcome,
    status: record.status,
    detail: record.detail,
    durationMs: record.durationMs,
  })
  if (record.outcome === "refused" || record.secrets.length === 0) return
  await db
    .update(secret)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(secret.userId, record.caller.userId),
        inArray(
          secret.id,
          record.secrets.map((row) => row.id)
        )
      )
    )
}

function decryptOf(row: Secret): SecretValues | null {
  return decryptValues(row.ciphertext, { secretId: row.id, userId: row.userId })
}

function maskBody(body: ResponseBody, mask: (text: string) => string) {
  if (body.kind !== "text") return body
  return { ...body, text: mask(body.text) }
}

/** Plans, sends and records one request of `caller`'s. */
export async function executeRequest(
  caller: RequestCaller,
  input: RequestInput,
  options: SendOptions = DEFAULT_SEND_OPTIONS
): Promise<RequestResult> {
  const secrets = await db
    .select()
    .from(secret)
    .where(eq(secret.userId, caller.userId))

  // Each secret is decrypted once, and only if the request uses it.
  const decrypted = new Map<string, SecretValues | null>()
  const valuesOf = (row: Secret): SecretValues | null => {
    if (!decrypted.has(row.name)) decrypted.set(row.name, decryptOf(row))
    return decrypted.get(row.name) ?? null
  }

  const planned = planRequest(input, secrets, valuesOf)
  if (!planned.ok) {
    const { reason, secretNames } = planned.refusal
    await recordUsage({
      caller,
      secrets: secrets.filter((row) => secretNames.includes(row.name)),
      secretNames,
      input,
      outcome: "refused",
      status: null,
      detail: reason,
      durationMs: null,
    })
    return { ok: false, message: reason }
  }

  const { plan } = planned
  const values = new Map<string, SecretValues>()
  for (const row of plan.secrets) {
    const rowValues = valuesOf(row)
    if (rowValues !== null) values.set(row.name, rowValues)
  }
  const rendered = plan.render(values)

  const fieldValues = plan.secrets.flatMap((row) =>
    Object.entries(values.get(row.name) ?? {}).map(([field, text]) => ({
      label: `${row.name}.${field}`,
      text,
    }))
  )
  const mask = createMasker([...fieldValues, ...rendered.placeholders])

  const started = performance.now()
  const sent = await send(rendered.request, options)
  const durationMs = Math.round(performance.now() - started)
  const secretNames = plan.secrets.map((row) => row.name)

  if (!sent.ok) {
    const message = mask(sent.failure)
    await recordUsage({
      caller,
      secrets: plan.secrets,
      secretNames,
      input,
      outcome: "failed",
      status: null,
      detail: message,
      durationMs,
    })
    return { ok: false, message }
  }

  await recordUsage({
    caller,
    secrets: plan.secrets,
    secretNames,
    input,
    outcome: "sent",
    status: sent.response.status,
    detail: null,
    durationMs,
  })
  const { response } = sent
  return {
    ok: true,
    response: {
      status: response.status,
      statusText: mask(response.statusText),
      headers: response.headers.map(([name, value]) => [name, mask(value)]),
      body: maskBody(response.body, mask),
    },
  }
}
