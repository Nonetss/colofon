import { isRecord } from "#contract/read/records"
import {
  DECLARATION_KEYS,
  ENTITY_KEYS,
  SPANISH_KINDS,
  spanishOf,
} from "#contract/versions/contract-1"
import { CONTRACT_1_VALUE } from "#contract/versions/detect"

// The editor's schemas for a contract 1 repository: the contract 2 JSON
// Schemas, renamed to the Spanish names the repository writes
// (`content-editor-schemas`).

/**
 * The editor's JSON Schema of a version 2 file, under the version 1 names
 * (`content-editor-schemas`). A declaration (`doc.config.yaml`,
 * `menu.yaml`, `_type.yaml`) has every property renamed, the field kinds and
 * the version among them; an entity, only its `source` and `updated`, since
 * every other property is a field the site named. JSON Schema's own keywords
 * are never renamed: only the keys of `properties` and `required` are.
 */
export function contract1JsonSchema(
  schema: Record<string, unknown>,
  file: "declaration" | "entity"
): Record<string, unknown> {
  if (file === "entity") return renameNode(schema, ENTITY_KEYS, false)
  return renameNode(schema, DECLARATION_KEYS, true)
}

function renameNode(
  node: Record<string, unknown>,
  keys: ReadonlyMap<string, string>,
  deep: boolean
): Record<string, unknown> {
  const renamed: Record<string, unknown> = {}
  for (const [keyword, value] of Object.entries(node)) {
    renamed[keyword] = renamedKeyword(keyword, value, keys, deep)
  }
  return renamed
}

function renamedKeyword(
  keyword: string,
  value: unknown,
  keys: ReadonlyMap<string, string>,
  deep: boolean
): unknown {
  if (keyword === "properties" && isRecord(value))
    return renameProperties(value, keys, deep)
  if (keyword === "required" && Array.isArray(value))
    return value.map((name) => renamedName(name, keys))
  if (!deep) return value
  if (keyword === "description" && typeof value === "string")
    return renameInText(value, keys)
  return renameAny(value, keys)
}

function renameAny(value: unknown, keys: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => renameAny(item, keys))
  if (isRecord(value)) return renameNode(value, keys, true)
  return value
}

function renamedName(
  name: unknown,
  keys: ReadonlyMap<string, string>
): unknown {
  if (typeof name !== "string") return name
  return spanishOf(keys, name)
}

function renameProperties(
  properties: Record<string, unknown>,
  keys: ReadonlyMap<string, string>,
  deep: boolean
): Record<string, unknown> {
  const renamed: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(properties)) {
    const property = propertyValue(name, value, keys, deep)
    renamed[spanishOf(keys, name)] = property
  }
  return renamed
}

function propertyValue(
  name: string,
  value: unknown,
  keys: ReadonlyMap<string, string>,
  deep: boolean
): unknown {
  if (!deep || !isRecord(value)) return value
  if (name === "type") return renameNode(withValues(value, kindOf), keys, true)
  if (name === "contract")
    return renameNode(
      withValues(value, () => CONTRACT_1_VALUE),
      keys,
      true
    )
  return renameNode(value, keys, true)
}

/** A schema whose `enum` and `const` values went through `rename`. */
function withValues(
  schema: Record<string, unknown>,
  rename: (value: string) => string
): Record<string, unknown> {
  const renamed: Record<string, unknown> = { ...schema }
  if (Array.isArray(schema.enum))
    renamed.enum = schema.enum.map((value) => renamedValueOf(value, rename))
  if (typeof schema.const === "string") renamed.const = rename(schema.const)
  return renamed
}

function renamedValueOf(
  value: unknown,
  rename: (value: string) => string
): unknown {
  if (typeof value !== "string") return value
  return rename(value)
}

function kindOf(english: string): string {
  return spanishOf(SPANISH_KINDS, english)
}

/** Key and kind names written between backticks in a description. */
function renameInText(text: string, keys: ReadonlyMap<string, string>): string {
  return text.replace(/`([a-z_]+)`/g, (_match, name: string) => {
    if (keys.has(name)) return `\`${spanishOf(keys, name)}\``
    return `\`${kindOf(name)}\``
  })
}
