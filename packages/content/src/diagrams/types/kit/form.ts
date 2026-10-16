import { z } from "zod"
import { enumOf } from "#contract/enum-of"
import { salvaged, salvagedList } from "#diagrams/report"
import {
  type Item,
  type ItemWritten,
  readItem,
} from "#diagrams/types/kit/items"
import type { Tools } from "#diagrams/types/kit/scene"

// What every typed form's schema and reader share: the file's common keys,
// and reading a list of items (each an item plus its form's own fields).

const text = z.string().min(1)

/** The keys every typed form accepts besides its own. */
export const FORM_KEYS = ["$schema", "type", "title", "desc", "variant"]

/** The schema of a whole file of the form `name`, for the editor. */
export function formSchema<Shape extends z.ZodRawShape>(
  name: string,
  variants: readonly string[],
  shape: Shape
) {
  const common = {
    $schema: z.string().optional(),
    type: z.literal(name),
    title: text.meta({ description: "El título del diagrama" }),
    desc: text.meta({
      description: "Qué muestra, en una o dos frases: es su texto alternativo",
    }),
  }
  if (variants.length === 0) return z.strictObject({ ...common, ...shape })
  return z.strictObject({
    ...common,
    variant: enumOf(variants, "Este tipo no tiene variantes")
      .optional()
      .meta({ description: `Su variante: ${variants.join(", ")}` }),
    ...shape,
  })
}

/**
 * The items of the list `key`, each checked by `schema` (an item's fields
 * plus its form's own) and read as an item, with what it was written as.
 * `required` names the fields without which an item is left out.
 */
export function itemList<O extends ItemWritten>(
  schema: z.ZodType<O>,
  value: unknown,
  key: string,
  tools: Tools,
  options: {
    required?: readonly string[]
    needsId?: boolean
    listRequired?: boolean
  } = {}
): { item: Item; written: O; index: number }[] {
  const read: { item: Item; written: O; index: number }[] = []
  for (const { at, index, value: written } of salvagedList(
    schema,
    value,
    key,
    options.required ?? [],
    tools.report,
    options.listRequired ?? true
  )) {
    read.push({
      item: readItem(written, at, tools, options.needsId === true),
      written,
      index,
    })
  }
  return read
}

/** One item at `key`, checked by `schema`, `null` when it is missing. */
export function oneItem<O extends ItemWritten>(
  schema: z.ZodType<O>,
  value: unknown,
  key: string,
  tools: Tools
): { item: Item; written: O } | null {
  if (value === undefined) {
    tools.report(key, "Falta: es obligatorio")
    return null
  }
  const written = salvaged(schema, value, key, [], tools.report)
  if (written === null) return null
  return { item: readItem(written, key, tools, false), written }
}
