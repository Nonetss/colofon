import { isRecord } from "#contract/read/records"
import type { ContractVersion } from "#contract/versions/detect"

// Contract 1: the Spanish names of the contract (`content-contract`,
// "Contract 1 names"). A version 1 file is translated to the version 2 keys
// before it is validated, so the platform keeps one schema and one model;
// each problem path is then mapped back so it names the keys the file holds.
// The renames are positional (`etiqueta` is `title_field` at a type's root
// and `label` in a field) and only touch the contract's own keys: field
// names, ids and every other name the content chooses are left as written.

/** What one version 1 key becomes, and how its value is read. */
type Rename = {
  to: string
  /** The shape of its value, when the value holds more contract keys. */
  shape?: () => Shape
  /** Renamed values, alone or in a list (field kinds, reserved columns). */
  values?: Readonly<Record<string, string>>
  /** A value that replaces whatever the file says (the version itself). */
  constant?: string
}

type Shape =
  | { kind: "object"; keys: Readonly<Record<string, Rename>> }
  | { kind: "map"; value: () => Shape }
  | { kind: "list"; item: () => Shape }

/** The kinds whose names changed; `url`, `email`, `ip`, `enum`, `ref` didn't. */
const FIELD_KINDS: Readonly<Record<string, string>> = {
  texto: "text",
  numero: "number",
  entero: "integer",
  booleano: "boolean",
  fecha: "date",
  ficha: "page",
  lista: "list",
  objeto: "object",
}

const FIELD: Shape = {
  kind: "object",
  keys: {
    tipo: { to: "type", values: FIELD_KINDS },
    opcional: { to: "optional" },
    descripcion: { to: "description" },
    etiqueta: { to: "label" },
    valores: { to: "values" },
    a: { to: "to" },
    de: { to: "of", shape: () => FIELD },
    campos: { to: "fields", shape: () => FIELD_MAP },
  },
}

const FIELD_MAP: Shape = { kind: "map", value: () => FIELD }

const CONFIG: Shape = {
  kind: "object",
  keys: {
    nombre: { to: "name" },
    descripcion: { to: "description" },
    plataforma: { to: "contract", constant: "2" },
    cabecera: { to: "header", shape: () => FIELD_MAP },
  },
}

const MENU_ENTRY: Shape = {
  kind: "object",
  keys: {
    ruta: { to: "path" },
    titulo: { to: "title" },
    icono: { to: "icon" },
  },
}

const MENU_GROUP: Shape = {
  kind: "object",
  keys: {
    titulo: { to: "title" },
    icono: { to: "icon" },
    descripcion: { to: "description" },
    paginas: {
      to: "pages",
      shape: () => ({ kind: "list", item: () => MENU_ENTRY }),
    },
  },
}

const MENU: Shape = {
  kind: "object",
  keys: {
    secciones: {
      to: "sections",
      shape: () => ({ kind: "list", item: () => MENU_GROUP }),
    },
  },
}

/** The entity fields every type has, which a type's columns can name. */
const RESERVED_FIELDS: Readonly<Record<string, string>> = {
  fuente: "source",
  actualizado: "updated",
}

const VIEW: Shape = {
  kind: "object",
  keys: { columnas: { to: "columns", values: RESERVED_FIELDS } },
}

const TYPE: Shape = {
  kind: "object",
  keys: {
    nombre: { to: "name" },
    plural: { to: "plural" },
    icono: { to: "icon" },
    descripcion: { to: "description" },
    etiqueta: { to: "title_field" },
    campos: { to: "fields", shape: () => FIELD_MAP },
    vista: { to: "view", shape: () => VIEW },
  },
}

const PAGE_HEADER: Shape = {
  kind: "object",
  keys: {
    titulo: { to: "title" },
    descripcion: { to: "description" },
    icono: { to: "icon" },
    orden: { to: "order" },
    actualizado: { to: "updated" },
  },
}

const ENTITY: Shape = {
  kind: "object",
  keys: {
    fuente: { to: "source" },
    actualizado: { to: "updated" },
  },
}

/** The files a version 1 repository holds that name contract keys. */
export const V1_FILES = {
  config: CONFIG,
  menu: MENU,
  type: TYPE,
  pageHeader: PAGE_HEADER,
  entity: ENTITY,
} as const

export type V1File = keyof typeof V1_FILES

/**
 * How a file that names contract keys is read: which kind of file it is, and
 * the repository's contract version, which says whether it is translated
 * from the version 1 names before it is validated.
 */
export type ContractReading = { contract: ContractVersion; file: V1File }

export type Translation = {
  /** The file's data under the version 2 names. */
  data: unknown
  /**
   * Version 2 keys found where version 1 has its own names, with their
   * paths as the file writes them. They are left out of `data`.
   */
  foreign: PropertyKey[][]
}

/** Translates the data of a version 1 `file` to the version 2 names. */
export function translateV1(file: V1File, data: unknown): Translation {
  const foreign: PropertyKey[][] = []
  return { data: translate(V1_FILES[file], data, [], foreign), foreign }
}

function translate(
  shape: Shape,
  data: unknown,
  at: readonly PropertyKey[],
  foreign: PropertyKey[][]
): unknown {
  if (shape.kind === "list") {
    if (!Array.isArray(data)) return data
    return data.map((item, index) =>
      translate(shape.item(), item, [...at, index], foreign)
    )
  }
  if (!isRecord(data)) return data
  if (shape.kind === "map") {
    const translated: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(data)) {
      translated[name] = translate(shape.value(), value, [...at, name], foreign)
    }
    return translated
  }
  const english = englishKeys(shape.keys)
  const translated: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    const rename = shape.keys[key]
    if (rename !== undefined && Object.hasOwn(shape.keys, key)) {
      translated[rename.to] = renamedValue(rename, value, [...at, key], foreign)
      continue
    }
    if (english.has(key)) {
      foreign.push([...at, key])
      continue
    }
    translated[key] = value
  }
  return translated
}

function renamedValue(
  rename: Rename,
  value: unknown,
  at: readonly PropertyKey[],
  foreign: PropertyKey[][]
): unknown {
  if (rename.constant !== undefined) return rename.constant
  const { values } = rename
  if (values !== undefined && typeof value === "string")
    return renamedKind(values, value)
  if (values !== undefined && Array.isArray(value))
    return value.map((item) => renamedItem(values, item))
  if (rename.shape !== undefined)
    return translate(rename.shape(), value, at, foreign)
  return value
}

function renamedItem(
  values: Readonly<Record<string, string>>,
  item: unknown
): unknown {
  if (typeof item !== "string") return item
  return renamedKind(values, item)
}

function renamedKind(
  values: Readonly<Record<string, string>>,
  value: string
): string {
  if (!Object.hasOwn(values, value)) return value
  const renamed = values[value]
  if (renamed === undefined) return value
  return renamed
}

/** The version 2 keys of a position that version 1 names otherwise. */
function englishKeys(keys: Readonly<Record<string, Rename>>): Set<string> {
  const english = new Set<string>()
  for (const [spanish, rename] of Object.entries(keys)) {
    if (rename.to !== spanish) english.add(rename.to)
  }
  return english
}

/**
 * Maps a problem path of a translated `file` back to the keys the version 1
 * file holds (`["title_field"]` → `["etiqueta"]`); what the walk cannot place
 * is kept as is.
 */
export function v1Path(
  file: V1File,
  path: readonly PropertyKey[]
): PropertyKey[] {
  const mapped: PropertyKey[] = []
  let shape: Shape | undefined = V1_FILES[file]
  for (const segment of path) {
    if (shape === undefined) {
      mapped.push(segment)
      continue
    }
    if (shape.kind === "list") {
      mapped.push(segment)
      shape = shape.item()
      continue
    }
    if (shape.kind === "map") {
      mapped.push(segment)
      shape = shape.value()
      continue
    }
    const found = spanishKeyOf(shape.keys, segment)
    if (found === undefined) {
      mapped.push(segment)
      shape = undefined
      continue
    }
    mapped.push(found.key)
    shape = found.rename.shape?.()
  }
  return mapped
}

function spanishKeyOf(
  keys: Readonly<Record<string, Rename>>,
  segment: PropertyKey
): { key: string; rename: Rename } | undefined {
  for (const [key, rename] of Object.entries(keys)) {
    if (rename.to === segment) return { key, rename }
  }
  return undefined
}

/** Version 2 keys that problem messages name, with their version 1 names. */
const MESSAGE_KEYS = {
  title: "titulo",
  description: "descripcion",
  icon: "icono",
  order: "orden",
  updated: "actualizado",
  sections: "secciones",
  pages: "paginas",
  to: "a",
  of: "de",
  fields: "campos",
} as const

export type MessageKey = keyof typeof MESSAGE_KEYS

/** How a repository on `version` names the contract key `key`. */
export function contractKey(version: ContractVersion, key: MessageKey): string {
  if (version === "2") return key
  return MESSAGE_KEYS[key]
}

/** The version 1 path of a version 2 problem path, for `version` repositories. */
export function pathFor(
  version: ContractVersion,
  file: V1File,
  path: readonly PropertyKey[]
): PropertyKey[] {
  if (version === "2") return [...path]
  return v1Path(file, path)
}

/** Version 2 key → version 1 key, over every shape listed. */
function spanishKeys(shapes: readonly Shape[]): ReadonlyMap<string, string> {
  const keys = new Map<string, string>()
  for (const shape of shapes) {
    if (shape.kind !== "object") continue
    for (const [spanish, rename] of Object.entries(shape.keys))
      keys.set(rename.to, spanish)
  }
  return keys
}

/** Version 1 names of the keys of `doc.config.yaml`, `menu.yaml`, `_type.yaml` and their fields, by version 2 name. */
export const DECLARATION_KEYS = spanishKeys([
  CONFIG,
  MENU,
  MENU_GROUP,
  MENU_ENTRY,
  TYPE,
  VIEW,
  FIELD,
])

/** Version 1 names of an entity's reserved fields. */
export const ENTITY_KEYS = spanishKeys([ENTITY])

/** Version 1 names of the field kinds that changed. */
export const SPANISH_KINDS: ReadonlyMap<string, string> = new Map(
  Object.entries(FIELD_KINDS).map(([spanish, english]) => [english, spanish])
)

/** The version 1 name of `english` in `keys`, itself when it kept its name. */
export function spanishOf(
  keys: ReadonlyMap<string, string>,
  english: string
): string {
  const spanish = keys.get(english)
  if (spanish === undefined) return english
  return spanish
}
