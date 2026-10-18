// Masking of the values a request used, wherever a response echoes them:
// raw and in the encodings a service is likely to send them back in. Each
// occurrence becomes `[secret:<secret>.<field>]`, or `[secret]` for a
// combined placeholder such as `basic(...)`.

/** A value to hide and the label that replaces it. */
export type MaskedValue = { label: string | null; text: string }

/** Values shorter than this are left alone: masking them would mangle text. */
const MIN_MASKED_LENGTH = 4

function replacementOf(label: string | null): string {
  if (label === null) return "[secret]"
  return `[secret:${label}]`
}

/** The forms of `text` a response may hold. */
function formsOf(text: string): string[] {
  const base64 = Buffer.from(text, "utf8").toString("base64")
  const base64url = Buffer.from(text, "utf8").toString("base64url")
  const jsonEscaped = JSON.stringify(text).slice(1, -1)
  return [text, base64, base64url, encodeURIComponent(text), jsonEscaped]
}

/**
 * A function that masks every form of `values` in a text. Longer needles go
 * first, so a combined value that contains a field's value is masked whole.
 */
export function createMasker(values: MaskedValue[]): (text: string) => string {
  const needles = new Map<string, string>()
  for (const value of values) {
    if (value.text.length < MIN_MASKED_LENGTH) continue
    for (const form of formsOf(value.text)) {
      if (form.length < MIN_MASKED_LENGTH || needles.has(form)) continue
      needles.set(form, replacementOf(value.label))
    }
  }
  const ordered = [...needles.entries()].sort(([a], [b]) => b.length - a.length)
  return (text) =>
    ordered.reduce(
      (masked, [needle, replacement]) => masked.split(needle).join(replacement),
      text
    )
}
