import type {
  SecretCreateInput,
  SecretListItem,
  SecretUpdateInput,
} from "@/features/secrets/manage/model/types"

// The secret form's state and what it sends. Values are write-only: a stored
// field starts with an empty value, which means "keep it", and the form never
// holds a stored value because the API never sends one.

/** One field row of the form. */
export interface SecretFieldDraft {
  /** Stable React key; not sent. */
  key: string
  name: string
  value: string
  /** Whether the server already holds a value for it. */
  stored: boolean
}

export interface SecretFormValues {
  name: string
  description: string
  /** One origin per line. */
  origins: string
  allowWrite: boolean
  allowInUrl: boolean
  allowInBody: boolean
  fields: SecretFieldDraft[]
  /** The organizations it is shared with; saved apart, by `share`. */
  organizationIds: string[]
}

/** The most fields a secret holds, as the API allows. */
export const MAX_SECRET_FIELDS = 10

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const FIELD_PATTERN = /^[a-z][a-z0-9_]*$/

let draftCount = 0

function draftKey(): string {
  draftCount += 1
  return `field-${draftCount}`
}

/** An empty field row, for a new field. */
export function newFieldDraft(): SecretFieldDraft {
  return { key: draftKey(), name: "", value: "", stored: false }
}

/** The form of a new secret: one empty field. */
export function emptySecretForm(): SecretFormValues {
  return {
    name: "",
    description: "",
    origins: "",
    allowWrite: false,
    allowInUrl: false,
    allowInBody: false,
    fields: [newFieldDraft()],
    organizationIds: [],
  }
}

/** The ids of the organizations a secret is shared with; none for a new one. */
export function sharedOrganizationIds(secret: SecretListItem | null): string[] {
  if (secret === null) return []
  return secret.organizations.map((organization) => organization.id)
}

/** The form of an existing secret: its stored fields, values left empty. */
export function secretFormFrom(secret: SecretListItem): SecretFormValues {
  return {
    name: secret.name,
    description: secret.description ?? "",
    origins: secret.origins.join("\n"),
    allowWrite: secret.allowWrite,
    allowInUrl: secret.allowInUrl,
    allowInBody: secret.allowInBody,
    fields: secret.fields.map((name) => ({
      key: draftKey(),
      name,
      value: "",
      stored: true,
    })),
    organizationIds: sharedOrganizationIds(secret),
  }
}

/** The non-empty lines of the origins box. */
export function originsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

/** What's wrong with the form, per part; empty when it can be sent. */
export interface SecretFormProblems {
  name?: string
  origins?: string
  fields?: string
}

/**
 * Checks what the server would refuse, in Spanish. `needsEveryValue` is set
 * for a secret whose stored values can't be decrypted: every field must be
 * written again.
 */
export function secretFormProblems(
  values: SecretFormValues,
  needsEveryValue: boolean
): SecretFormProblems {
  const problems: SecretFormProblems = {}
  const name = values.name.trim()
  if (!NAME_PATTERN.test(name) || name.length > 40) {
    problems.name =
      "Usa minúsculas, números y guiones, empezando por letra o número (máximo 40)."
  }
  if (originsFromText(values.origins).length === 0) {
    problems.origins = "Indica al menos un origen."
  }
  const fieldProblem = fieldsProblem(values.fields, needsEveryValue)
  if (fieldProblem !== null) problems.fields = fieldProblem
  return problems
}

function fieldsProblem(
  fields: SecretFieldDraft[],
  needsEveryValue: boolean
): string | null {
  if (fields.length === 0) return "Añade al menos un campo."
  const names = fields.map((field) => field.name.trim())
  if (names.some((name) => !FIELD_PATTERN.test(name) || name.length > 40)) {
    return "Los nombres de campo usan minúsculas, números y guiones bajos, empezando por letra."
  }
  if (new Set(names).size !== names.length) {
    return "Los nombres de campo no se pueden repetir."
  }
  const missing = fields.find(
    (field) => field.value === "" && (!field.stored || needsEveryValue)
  )
  if (missing !== undefined) {
    return `Escribe el valor de ${missing.name.trim()}.`
  }
  return null
}

function descriptionOf(values: SecretFormValues): string | null {
  const description = values.description.trim()
  if (description === "") return null
  return description
}

/** The create request for a new secret's form. */
export function createInputOf(values: SecretFormValues): SecretCreateInput {
  return {
    name: values.name.trim(),
    description: descriptionOf(values),
    origins: originsFromText(values.origins),
    allowWrite: values.allowWrite,
    allowInUrl: values.allowInUrl,
    allowInBody: values.allowInBody,
    fields: values.fields.map((field) => ({
      name: field.name.trim(),
      value: field.value,
    })),
  }
}

/**
 * The update request for an existing secret's form: every property, and the
 * full field list, where a field without a new value keeps the stored one.
 */
export function updateInputOf(
  id: string,
  values: SecretFormValues
): SecretUpdateInput {
  return {
    id,
    name: values.name.trim(),
    description: descriptionOf(values),
    origins: originsFromText(values.origins),
    allowWrite: values.allowWrite,
    allowInUrl: values.allowInUrl,
    allowInBody: values.allowInBody,
    fields: values.fields.map((field) => {
      const name = field.name.trim()
      if (field.value === "") return { name }
      return { name, value: field.value }
    }),
  }
}
