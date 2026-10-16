// The placeholders of the MCP `request` tool: `{{ <expression> }}` in a URL,
// a header value or the body, where an expression is `<secret>.<field>` or
// one of the functions below applied to such refs. A `{{…}}` that is neither
// a valid expression nor clearly meant as one stays literal text, so templates
// in a body (`{{ $labels.instance }}`) go through unchanged.

/** Where a placeholder sits in the request; each secret allows some. */
export type PlaceholderLocation = "url" | "header" | "body"

/** One field of one secret. */
export type SecretRef = { secret: string; field: string }

export type PlaceholderExpression =
  | { kind: "ref"; ref: SecretRef }
  | { kind: "base64"; ref: SecretRef }
  | { kind: "urlencode"; ref: SecretRef }
  | { kind: "basic"; user: SecretRef; password: SecretRef }

export type Placeholder = {
  /** As written, braces included. */
  raw: string
  expression: PlaceholderExpression
  location: PlaceholderLocation
}

/** A text split into literal runs and placeholders. */
export type Template = (string | Placeholder)[]

/** A placeholder the agent wrote wrong; the message quotes it. */
export class PlaceholderError extends Error {}

const FUNCTIONS = ["basic", "base64", "urlencode"] as const

const NAME = "[a-z0-9][a-z0-9-]*"
const FIELD = "[a-z][a-z0-9_]*"
const REF = `(${NAME})\\.(${FIELD})`
const REF_PATTERN = new RegExp(`^\\s*${REF}\\s*$`)
const CALL_PATTERN = new RegExp(
  `^\\s*(${FUNCTIONS.join("|")})\\(\\s*${REF}\\s*(?:,\\s*${REF}\\s*)?\\)\\s*$`
)
const LEADING_NAME = /^\s*([a-z0-9][a-z0-9_-]*)/

/** Longest quote of a wrong placeholder put in an error message. */
const QUOTE_LIMIT = 60

function quote(text: string): string {
  if (text.length <= QUOTE_LIMIT) return text
  return `${text.slice(0, QUOTE_LIMIT)}…`
}

function ref(secret: string | undefined, field: string | undefined) {
  if (secret === undefined || field === undefined) return null
  return { secret, field }
}

function callExpression(
  match: RegExpMatchArray,
  raw: string
): PlaceholderExpression {
  const [, name, s1, f1, s2, f2] = match
  const first = ref(s1, f1)
  const second = ref(s2, f2)
  if (first === null) throw new PlaceholderError(`Invalid placeholder ${raw}`)
  if (name === "basic") {
    if (second === null) {
      throw new PlaceholderError(
        `Invalid placeholder ${raw}: basic takes two fields, basic(<secret>.<user>, <secret>.<password>)`
      )
    }
    return { kind: "basic", user: first, password: second }
  }
  if (second !== null) {
    throw new PlaceholderError(
      `Invalid placeholder ${raw}: ${name} takes one field`
    )
  }
  if (name === "base64") return { kind: "base64", ref: first }
  return { kind: "urlencode", ref: first }
}

/**
 * The expression `inner` (the text between the braces) holds, `null` when it
 * is meant as literal text, or a `PlaceholderError` when it is clearly meant
 * as a placeholder but malformed: it starts with a function's or one of
 * the caller's secrets' name.
 */
function parseExpression(
  inner: string,
  raw: string,
  isSecretName: (name: string) => boolean
): PlaceholderExpression | null {
  const refMatch = inner.match(REF_PATTERN)
  if (refMatch) {
    const [, secret, field] = refMatch
    const parsed = ref(secret, field)
    if (parsed !== null) return { kind: "ref", ref: parsed }
  }
  const callMatch = inner.match(CALL_PATTERN)
  if (callMatch) return callExpression(callMatch, raw)

  const leading = inner.match(LEADING_NAME)?.[1]
  if (leading === undefined) return null
  const isFunction = FUNCTIONS.some((name) => name === leading)
  if (isFunction || isSecretName(leading)) {
    throw new PlaceholderError(
      `Invalid placeholder ${quote(raw)}: write {{<secret>.<field>}}, {{base64(<secret>.<field>)}}, {{urlencode(<secret>.<field>)}} or {{basic(<secret>.<user>, <secret>.<password>)}}`
    )
  }
  return null
}

/** `text` split into literal runs and the placeholders it holds. */
export function parseTemplate(
  text: string,
  location: PlaceholderLocation,
  isSecretName: (name: string) => boolean
): Template {
  const template: Template = []
  let literal = ""
  let position = 0
  for (;;) {
    const open = text.indexOf("{{", position)
    if (open === -1) {
      literal += text.slice(position)
      break
    }
    const close = text.indexOf("}}", open + 2)
    if (close === -1) {
      throw new PlaceholderError(
        `Unclosed placeholder ${quote(text.slice(open))}: close it with }}`
      )
    }
    const raw = text.slice(open, close + 2)
    literal += text.slice(position, open)
    const expression = parseExpression(
      text.slice(open + 2, close),
      raw,
      isSecretName
    )
    if (expression === null) {
      literal += raw
    } else {
      if (literal !== "") template.push(literal)
      literal = ""
      template.push({ raw, expression, location })
    }
    position = close + 2
  }
  if (literal !== "") template.push(literal)
  return template
}

/** The placeholders of `template`. */
export function placeholdersOf(template: Template): Placeholder[] {
  return template.filter(
    (segment): segment is Placeholder => typeof segment !== "string"
  )
}

/** `template` with each placeholder replaced by `render(placeholder)`. */
export function renderTemplate(
  template: Template,
  render: (placeholder: Placeholder) => string
): string {
  return template
    .map((segment) => {
      if (typeof segment === "string") return segment
      return render(segment)
    })
    .join("")
}

/** The fields an expression reads. */
export function refsOf(expression: PlaceholderExpression): SecretRef[] {
  if (expression.kind === "basic") return [expression.user, expression.password]
  return [expression.ref]
}

/** What an expression becomes, given each field's value. */
export function renderExpression(
  expression: PlaceholderExpression,
  fieldValue: (ref: SecretRef) => string
): string {
  switch (expression.kind) {
    case "ref":
      return fieldValue(expression.ref)
    case "base64":
      return Buffer.from(fieldValue(expression.ref), "utf8").toString("base64")
    case "urlencode":
      return encodeURIComponent(fieldValue(expression.ref))
    case "basic":
      return Buffer.from(
        `${fieldValue(expression.user)}:${fieldValue(expression.password)}`,
        "utf8"
      ).toString("base64")
  }
}
