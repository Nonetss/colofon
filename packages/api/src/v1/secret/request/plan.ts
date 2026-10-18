import type { Secret } from "@nonete/db/schema"
import type { SecretValues } from "#lib/cipher"
import { originAllowed, originOfUrl } from "#v1/secret/origins"
import {
  type Placeholder,
  PlaceholderError,
  type PlaceholderLocation,
  parseTemplate,
  placeholdersOf,
  refsOf,
  renderExpression,
  renderTemplate,
  type Template,
} from "#v1/secret/request/placeholders"

// Everything the MCP `request` tool checks before sending: the request's own
// shape, its placeholders, and each secret's rules (owner, origins, where its
// placeholders may sit, write methods). A plan that passes knows which
// secrets it uses and renders the outgoing request from their values.

export const REQUEST_METHODS = [
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const

export type RequestMethod = (typeof REQUEST_METHODS)[number]

const READ_METHODS: readonly RequestMethod[] = ["GET", "HEAD", "OPTIONS"]

/** Headers that would let a request reach another host than its URL's. */
const FORBIDDEN_HEADERS = [
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "keep-alive",
  "proxy-authorization",
  "proxy-connection",
] as const

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json }

/** The request as the agent wrote it, placeholders included. */
export type RequestInput = {
  method: RequestMethod
  url: string
  headers?: Record<string, string>
  body?: Json
}

/** The request ready to send, placeholders substituted. */
export type RenderedRequest = {
  method: RequestMethod
  url: string
  headers: Headers
  body: string | undefined
}

/** One placeholder's substituted text, for masking it in the response. */
export type RenderedPlaceholder = {
  /** `<secret>.<field>` for a plain ref, `null` for a combined one. */
  label: string | null
  text: string
}

export type RequestPlan = {
  origin: string
  /** The secrets the placeholders name, each once, in order of use. */
  secrets: Secret[]
  render: (values: Map<string, SecretValues>) => {
    request: RenderedRequest
    placeholders: RenderedPlaceholder[]
  }
}

/** Why a request was refused before sending, never holding a value. */
export type PlanRefusal = {
  reason: string
  /** The secret names the request wrote, known or not. */
  secretNames: string[]
}

export type PlanResult =
  | { ok: true; plan: RequestPlan }
  | { ok: false; refusal: PlanRefusal }

/** The parsed request: its fixed origin and a template per slot. */
type ParsedRequest = {
  prefix: string
  origin: string
  rest: Template
  headers: { name: string; value: Template }[]
  body: ParsedBody
}

type ParsedBody =
  | { kind: "none" }
  | { kind: "text"; template: Template }
  | { kind: "json"; value: Json; templates: Map<string, Template> }

class RequestShapeError extends Error {}

function isReadMethod(method: RequestMethod): boolean {
  return READ_METHODS.includes(method)
}

function isForbiddenHeader(name: string): boolean {
  const lower = name.toLowerCase()
  return FORBIDDEN_HEADERS.some((header) => header === lower)
}

/**
 * Splits `url` into its origin part (scheme and authority, which can't hold
 * placeholders) and the rest, and checks the origin.
 */
function splitUrl(url: string): {
  prefix: string
  origin: string
  rest: string
} {
  const schemeEnd = url.indexOf("://")
  if (schemeEnd === -1) {
    throw new RequestShapeError(`Not an absolute http(s) URL: ${url}`)
  }
  const authorityStart = schemeEnd + 3
  const after = url.slice(authorityStart)
  const ends = ["/", "?", "#"]
    .map((mark) => after.indexOf(mark))
    .filter((index) => index !== -1)
  const authorityEnd = authorityStart + Math.min(after.length, ...ends)
  const prefix = url.slice(0, authorityEnd)
  if (prefix.includes("{{")) {
    throw new RequestShapeError(
      "Placeholders can't appear in the URL's scheme, host or port: write the service's address and put placeholders in the path, query or headers"
    )
  }
  let parsed: URL
  try {
    parsed = new URL(prefix)
  } catch {
    throw new RequestShapeError(`Not an absolute http(s) URL: ${url}`)
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new RequestShapeError(
      "The URL can't carry credentials: send them in a header with a placeholder"
    )
  }
  const origin = originOfUrl(parsed)
  if (origin === null) {
    throw new RequestShapeError("Only http and https URLs can be requested")
  }
  return { prefix, origin, rest: url.slice(authorityEnd) }
}

/** Calls `visit` on every string of `value` with its path, keys excluded. */
function eachJsonString(
  value: Json,
  path: string,
  visit: (text: string, path: string) => void
): void {
  if (typeof value === "string") {
    visit(value, path)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      eachJsonString(item, `${path}/${index}`, visit)
    })
    return
  }
  if (value === null || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    eachJsonString(item, `${path}/${key}`, visit)
  }
}

/** `value` with every string replaced by `replace(text, path)`. */
function mapJsonStrings(
  value: Json,
  path: string,
  replace: (text: string, path: string) => string
): Json {
  if (typeof value === "string") return replace(value, path)
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      mapJsonStrings(item, `${path}/${index}`, replace)
    )
  }
  if (value === null || typeof value !== "object") return value
  const mapped: { [key: string]: Json } = {}
  for (const [key, item] of Object.entries(value)) {
    mapped[key] = mapJsonStrings(item, `${path}/${key}`, replace)
  }
  return mapped
}

function parseBody(
  body: Json | undefined,
  parse: (text: string, location: PlaceholderLocation) => Template
): ParsedBody {
  if (body === undefined) return { kind: "none" }
  if (typeof body === "string") {
    return { kind: "text", template: parse(body, "body") }
  }
  const templates = new Map<string, Template>()
  eachJsonString(body, "", (text, path) => {
    templates.set(path, parse(text, "body"))
  })
  return { kind: "json", value: body, templates }
}

function parseRequest(
  input: RequestInput,
  isSecretName: (name: string) => boolean
): ParsedRequest {
  if (input.body !== undefined && isReadMethod(input.method)) {
    throw new RequestShapeError(`A ${input.method} request takes no body`)
  }
  const parse = (text: string, location: PlaceholderLocation) =>
    parseTemplate(text, location, isSecretName)

  const headers = Object.entries(input.headers ?? {}).map(([name, value]) => {
    if (isForbiddenHeader(name)) {
      throw new RequestShapeError(
        `The ${name.toLowerCase()} header can't be set: the request goes to the host its URL names`
      )
    }
    if (name.includes("{{")) {
      throw new RequestShapeError(
        `Header names can't hold placeholders: ${name}`
      )
    }
    return { name, value: parse(value, "header") }
  })

  const { prefix, origin, rest } = splitUrl(input.url)
  return {
    prefix,
    origin,
    rest: parse(rest, "url"),
    headers,
    body: parseBody(input.body, parse),
  }
}

function placeholdersOfRequest(parsed: ParsedRequest): Placeholder[] {
  const templates = [parsed.rest, ...parsed.headers.map((h) => h.value)]
  if (parsed.body.kind === "text") templates.push(parsed.body.template)
  if (parsed.body.kind === "json")
    templates.push(...parsed.body.templates.values())
  return templates.flatMap(placeholdersOf)
}

/** Each secret name the placeholders write, once, in order. */
function namesOf(placeholders: Placeholder[]): string[] {
  const names = placeholders.flatMap((placeholder) =>
    refsOf(placeholder.expression).map((ref) => ref.secret)
  )
  return [...new Set(names)]
}

const LOCATION_RULES = {
  url: {
    allowed: (secret: Secret) => secret.allowInUrl,
    where: "the URL",
    flag: "allow in URL",
  },
  body: {
    allowed: (secret: Secret) => secret.allowInBody,
    where: "the body",
    flag: "allow in body",
  },
  header: { allowed: () => true, where: "a header", flag: "" },
} satisfies Record<
  PlaceholderLocation,
  { allowed: (secret: Secret) => boolean; where: string; flag: string }
>

/**
 * Why `secrets` (the caller's) can't serve `placeholders` on a request to
 * `origin` with `method`, or `null` when they can.
 */
function ruleViolation(
  placeholders: Placeholder[],
  byName: Map<string, Secret>,
  values: (secret: Secret) => SecretValues | null,
  origin: string,
  method: RequestMethod
): string | null {
  for (const placeholder of placeholders) {
    for (const ref of refsOf(placeholder.expression)) {
      const secret = byName.get(ref.secret)
      if (secret === undefined) {
        return `You have no secret named "${ref.secret}". Call secrets to list yours.`
      }
      if (!secret.fieldNames.includes(ref.field)) {
        return `Secret "${secret.name}" has no field "${ref.field}"; its fields are ${secret.fieldNames.join(", ")}.`
      }
    }
  }

  const used = namesOf(placeholders).map((name) => byName.get(name))
  for (const secret of used) {
    if (secret === undefined) continue
    if (values(secret) === null) {
      return `Secret "${secret.name}" can't be decrypted (the server's encryption key changed); its owner must save its values again on /me/secrets.`
    }
    if (!secret.origins.some((allowed) => originAllowed(origin, allowed))) {
      return `Secret "${secret.name}" can only be sent to ${secret.origins.join(", ")}; this request goes to ${origin}.`
    }
  }

  for (const placeholder of placeholders) {
    const rule = LOCATION_RULES[placeholder.location]
    for (const ref of refsOf(placeholder.expression)) {
      const secret = byName.get(ref.secret)
      if (secret === undefined || rule.allowed(secret)) continue
      return `Secret "${secret.name}" can't be used in ${rule.where}; its owner can turn on "${rule.flag}" for it on /me/secrets.`
    }
  }

  if (!isReadMethod(method)) {
    for (const secret of used) {
      if (secret === undefined || secret.allowWrite) continue
      return `Secret "${secret.name}" only allows reading methods (GET, HEAD, OPTIONS); its owner can turn on "allow write" for it on /me/secrets to use it with ${method}.`
    }
  }
  return null
}

/**
 * Checks `input` against the caller's `secrets` and plans the request, or
 * says why it is refused. `values` decrypts a secret, `null` when it can't.
 */
export function planRequest(
  input: RequestInput,
  secrets: Secret[],
  values: (secret: Secret) => SecretValues | null
): PlanResult {
  const byName = new Map(secrets.map((secret) => [secret.name, secret]))
  let parsed: ParsedRequest
  try {
    parsed = parseRequest(input, (name) => byName.has(name))
  } catch (error) {
    if (
      error instanceof RequestShapeError ||
      error instanceof PlaceholderError
    ) {
      return { ok: false, refusal: { reason: error.message, secretNames: [] } }
    }
    throw error
  }

  const placeholders = placeholdersOfRequest(parsed)
  const secretNames = namesOf(placeholders)
  if (placeholders.length === 0) {
    return {
      ok: false,
      refusal: {
        reason:
          "request only sends requests that use one of your secrets: add a placeholder such as {{<secret>.<field>}} (call secrets to list them).",
        secretNames,
      },
    }
  }

  const violation = ruleViolation(
    placeholders,
    byName,
    values,
    parsed.origin,
    input.method
  )
  if (violation !== null) {
    return { ok: false, refusal: { reason: violation, secretNames } }
  }

  const used = secrets.filter((secret) => secretNames.includes(secret.name))
  return {
    ok: true,
    plan: {
      origin: parsed.origin,
      secrets: used,
      render: (decrypted) => renderRequest(input, parsed, decrypted),
    },
  }
}

function renderRequest(
  input: RequestInput,
  parsed: ParsedRequest,
  decrypted: Map<string, SecretValues>
) {
  const placeholders: RenderedPlaceholder[] = []
  const render = (placeholder: Placeholder): string => {
    const text = renderExpression(placeholder.expression, (ref) => {
      const value = decrypted.get(ref.secret)?.[ref.field]
      if (value === undefined) {
        throw new Error(`No value for ${ref.secret}.${ref.field}`)
      }
      return value
    })
    placeholders.push({ label: labelOf(placeholder), text })
    return text
  }

  const url = parsed.prefix + renderTemplate(parsed.rest, render)
  if (new URL(url).origin !== parsed.origin) {
    throw new Error("A rendered URL changed its origin")
  }

  const headers = new Headers()
  for (const header of parsed.headers) {
    headers.set(header.name, renderTemplate(header.value, render))
  }

  const body = renderBody(parsed.body, render)
  if (parsed.body.kind === "json" && !headers.has("content-type")) {
    headers.set("content-type", "application/json")
  }

  return {
    request: { method: input.method, url, headers, body },
    placeholders,
  }
}

function renderBody(
  body: ParsedBody,
  render: (placeholder: Placeholder) => string
): string | undefined {
  if (body.kind === "none") return undefined
  if (body.kind === "text") return renderTemplate(body.template, render)
  const rendered = mapJsonStrings(body.value, "", (text, path) => {
    const template = body.templates.get(path)
    if (template === undefined) return text
    return renderTemplate(template, render)
  })
  return JSON.stringify(rendered)
}

function labelOf(placeholder: Placeholder): string | null {
  if (placeholder.expression.kind === "basic") return null
  const { secret, field } = placeholder.expression.ref
  return `${secret}.${field}`
}

/** The URL as the usage log keeps it: no query or fragment, as written. */
export function loggedUrl(url: string): string {
  const cut = ["?", "#"]
    .map((mark) => url.indexOf(mark))
    .filter((index) => index !== -1)
  if (cut.length === 0) return url
  return url.slice(0, Math.min(...cut))
}
