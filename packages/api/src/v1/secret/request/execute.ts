import { db } from "@nonete/db"
import { type Secret, secret, secretUsage } from "@nonete/db/schema"
import { eq, inArray } from "drizzle-orm"
import { decryptValues, type SecretValues } from "#lib/cipher"
import { createMasker } from "#v1/secret/request/mask"
import {
  loggedUrl,
  planRequest,
  type RequestInput,
  type UsableSecret,
} from "#v1/secret/request/plan"
import {
  DEFAULT_SEND_OPTIONS,
  type ResponseBody,
  type SendOptions,
  send,
} from "#v1/secret/request/send"
import { sharedAddress, sharedSecretsOf } from "#v1/secret/sharing"

// The MCP `request` tool's pipeline: load the secrets the caller may use
// (their own and those shared with them through an organization), check and
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
  secrets: UsableSecret[]
  secretNames: string[]
  input: RequestInput
  outcome: "sent" | "refused" | "failed"
  status: number | null
  detail: string | null
  durationMs: number | null
}

async function recordUsage(record: UsageRecord): Promise<void> {
  // A secret shared through two organizations is still one secret.
  const secretIds = [...new Set(record.secrets.map((each) => each.secret.id))]
  await db.insert(secretUsage).values({
    userId: record.caller.userId,
    apiKeyId: record.caller.apiKeyId,
    secretIds,
    secretNames: record.secretNames,
    method: record.input.method,
    url: loggedUrl(record.input.url),
    outcome: record.outcome,
    status: record.status,
    detail: record.detail,
    durationMs: record.durationMs,
  })
  if (record.outcome === "refused" || secretIds.length === 0) return
  // By id alone: a member's call is a use of the owner's secret too.
  await db
    .update(secret)
    .set({ lastUsedAt: new Date() })
    .where(inArray(secret.id, secretIds))
}

/** The caller's own secrets by name, then those shared with them. */
async function usableSecretsOf(userId: string): Promise<UsableSecret[]> {
  const own = await db.select().from(secret).where(eq(secret.userId, userId))
  const shared = await sharedSecretsOf(userId)
  return [
    ...own.map((row) => ({ address: row.name, secret: row })),
    ...shared.map((each) => ({
      address: sharedAddress(each.organization.slug, each.secret.name),
      secret: each.secret,
    })),
  ]
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
  const secrets = await usableSecretsOf(caller.userId)

  // Each secret is decrypted once, and only if the request uses it.
  const decrypted = new Map<string, SecretValues | null>()
  const valuesOf = ({ secret: row }: UsableSecret): SecretValues | null => {
    if (!decrypted.has(row.id)) decrypted.set(row.id, decryptOf(row))
    return decrypted.get(row.id) ?? null
  }

  const planned = planRequest(input, secrets, valuesOf)
  if (!planned.ok) {
    const { reason, secretNames } = planned.refusal
    await recordUsage({
      caller,
      secrets: secrets.filter((each) => secretNames.includes(each.address)),
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
  for (const usable of plan.secrets) {
    const usableValues = valuesOf(usable)
    if (usableValues !== null) values.set(usable.address, usableValues)
  }
  const rendered = plan.render(values)

  const fieldValues = plan.secrets.flatMap(({ address }) =>
    Object.entries(values.get(address) ?? {}).map(([field, text]) => ({
      label: `${address}.${field}`,
      text,
    }))
  )
  const mask = createMasker([...fieldValues, ...rendered.placeholders])

  const started = performance.now()
  const sent = await send(rendered.request, options)
  const durationMs = Math.round(performance.now() - started)
  const secretNames = plan.secrets.map((usable) => usable.address)

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
