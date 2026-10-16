import { Text } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { FieldLabel } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MAX_SECRET_FIELDS,
  newFieldDraft,
  type SecretFieldDraft,
} from "@/features/secrets/manage/model/secret-form"
import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Remove = getIcon("controls", "close")

function valuePlaceholder(field: SecretFieldDraft, needsEveryValue: boolean) {
  if (field.stored && !needsEveryValue) return "Sin cambios"
  return "Valor"
}

/**
 * The secret's fields: a name and a write-only value each. A stored field's
 * value input starts empty and keeps the stored value while it stays empty.
 */
export function SecretFieldList({
  fields,
  onChange,
  needsEveryValue,
  problem,
}: {
  fields: SecretFieldDraft[]
  onChange: (fields: SecretFieldDraft[]) => void
  needsEveryValue: boolean
  problem: string | undefined
}) {
  const update = (key: string, patch: Partial<SecretFieldDraft>) =>
    onChange(
      fields.map((field) => {
        if (field.key !== key) return field
        return { ...field, ...patch }
      })
    )
  const remove = (key: string) =>
    onChange(fields.filter((field) => field.key !== key))

  return (
    <div className="min-w-0 space-y-2">
      <FieldLabel>Campos</FieldLabel>
      <ul className="space-y-2">
        {fields.map((field, index) => (
          <li key={field.key} className="flex items-center gap-2">
            <Input
              aria-label={`Nombre del campo ${index + 1}`}
              value={field.name}
              onChange={(event) =>
                update(field.key, { name: event.target.value })
              }
              placeholder="key"
              className="w-36 shrink-0 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <Input
              aria-label={`Valor del campo ${index + 1}`}
              type="password"
              value={field.value}
              onChange={(event) =>
                update(field.key, { value: event.target.value })
              }
              placeholder={valuePlaceholder(field, needsEveryValue)}
              autoComplete="new-password"
              className="min-w-0 flex-1"
            />
            <Hint label="Quitar campo">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar el campo ${index + 1}`}
                disabled={fields.length === 1}
                onClick={() => remove(field.key)}
              >
                <Remove className="size-3.5" />
              </Button>
            </Hint>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= MAX_SECRET_FIELDS}
        onClick={() => onChange([...fields, newFieldDraft()])}
      >
        <Plus className="size-3.5" />
        Añadir campo
      </Button>
      <Text as="p" variant="meta" tone="muted">
        El agente usa cada campo como {"{{nombre.campo}}"}. Los valores no se
        vuelven a mostrar, y los de menos de 4 caracteres no se tachan en las
        respuestas.
      </Text>
      {problem !== undefined && (
        <Text as="p" variant="meta" tone="destructive" role="alert">
          {problem}
        </Text>
      )}
    </div>
  )
}
