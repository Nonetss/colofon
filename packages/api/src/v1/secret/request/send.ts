import type { RenderedRequest } from "#v1/secret/request/plan"

// Sending a planned request: no redirects followed (they would carry the
// credentials elsewhere), a time budget for the whole exchange, and a body
// read up to a cap, with the rest only counted.

/** What `send` calls; `globalThis.fetch` outside tests. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type SendOptions = {
  fetch: FetchLike
  /** Budget for the whole exchange, body included. */
  timeoutMs: number
  /** How much of a text body is kept. */
  maxBodyBytes: number
}

export const DEFAULT_SEND_OPTIONS: SendOptions = {
  fetch: (url, init) => fetch(url, init),
  timeoutMs: 30_000,
  maxBodyBytes: 1024 * 1024,
}

export type ResponseBody =
  | { kind: "none" }
  | {
      kind: "text"
      text: string
      /** Bytes received; a lower bound when `complete` is false. */
      size: number
      truncated: boolean
      /** Whether the whole body arrived within the budget. */
      complete: boolean
    }
  | { kind: "binary"; contentType: string; size: number; complete: boolean }

export type SentResponse = {
  status: number
  statusText: string
  headers: [string, string][]
  body: ResponseBody
}

export type SendResult =
  | { ok: true; response: SentResponse }
  | { ok: false; failure: string }

const TEXT_TYPES = [
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-www-form-urlencoded",
  "application/x-ndjson",
  "application/problem+json",
]

/** Whether a body of `contentType` is returned as text. */
export function isTextual(contentType: string | null): boolean {
  if (contentType === null) return true
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  if (type === "") return true
  if (type.startsWith("text/")) return true
  if (type.endsWith("+json") || type.endsWith("+xml")) return true
  return TEXT_TYPES.includes(type)
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  )
}

function describeFailure(error: unknown, timeoutMs: number): string {
  if (isTimeout(error)) {
    return `The request timed out after ${Math.round(timeoutMs / 1000)} s`
  }
  if (error instanceof Error) return `The request failed: ${error.message}`
  return "The request failed"
}

/** `bytes` cut to at most `limit`, without splitting a UTF-8 character. */
function utf8Prefix(bytes: Uint8Array, limit: number): Uint8Array {
  if (bytes.length <= limit) return bytes
  let end = limit
  // Back off continuation bytes (10xxxxxx) to a character's first byte.
  while (end > 0 && ((bytes[end] ?? 0) & 0xc0) === 0x80) end -= 1
  return bytes.subarray(0, end)
}

type ReadBody = { kept: Uint8Array; size: number; complete: boolean }

/** Reads `stream`, keeping the first `keep` bytes and counting the rest. */
async function readBody(
  stream: ReadableStream<Uint8Array> | null,
  keep: number
): Promise<ReadBody> {
  if (stream === null)
    return { kept: new Uint8Array(), size: 0, complete: true }
  const chunks: Uint8Array[] = []
  let kept = 0
  let size = 0
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (kept < keep) {
        chunks.push(value)
        kept += value.length
      }
    }
  } catch (error) {
    if (!isTimeout(error)) throw error
    return { kept: concat(chunks), size, complete: false }
  }
  return { kept: concat(chunks), size, complete: true }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

async function bodyOf(
  response: Response,
  method: string,
  maxBodyBytes: number
): Promise<ResponseBody> {
  if (method === "HEAD" || response.body === null) return { kind: "none" }
  const contentType = response.headers.get("content-type")
  if (!isTextual(contentType)) {
    const read = await readBody(response.body, 0)
    return {
      kind: "binary",
      contentType: contentType ?? "",
      size: read.size,
      complete: read.complete,
    }
  }
  // One byte past the cap tells a cut body from one exactly at the cap.
  const read = await readBody(response.body, maxBodyBytes + 1)
  const truncated = read.size > maxBodyBytes
  const text = new TextDecoder().decode(utf8Prefix(read.kept, maxBodyBytes))
  if (read.size === 0 && read.complete) return { kind: "none" }
  return {
    kind: "text",
    text,
    size: read.size,
    truncated,
    complete: read.complete,
  }
}

/** Sends `request` and reads its response within the options' limits. */
export async function send(
  request: RenderedRequest,
  options: SendOptions
): Promise<SendResult> {
  const signal = AbortSignal.timeout(options.timeoutMs)
  try {
    const response = await options.fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
      credentials: "omit",
      signal,
    })
    const body = await bodyOf(response, request.method, options.maxBodyBytes)
    return {
      ok: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body,
      },
    }
  } catch (error) {
    return { ok: false, failure: describeFailure(error, options.timeoutMs) }
  }
}
