import { Text } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { SectionHeading } from "@/components/shared/layout/section-heading"
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

/** The grid every row shares: name, value, placeholder preview, remove. */
const ROW =
  "grid items-center gap-2 @xl:grid-cols-[9rem_minmax(0,1fr)_minmax(0,12rem)_2rem] grid-cols-[8rem_minmax(0,1fr)_2rem]"

function valuePlaceholder(field: SecretFieldDraft, needsEveryValue: boolean) {
  if (field.stored && !needsEveryValue) return "•••••• sin cambios"
  return "Valor"
}

/** What the agent writes for this field, `{{secret.field}}`. */
function placeholderOf(secretName: string, fieldName: string): string {
  const secret = secretName.trim() === "" ? "nombre" : secretName.trim()
  const field = fieldName.trim() === "" ? "campo" : fieldName.trim()
  return `{{${secret}.${field}}}`
}

/**
 * The secret's fields as a small table: a name and a write-only value each,
 * with the placeholder the agent uses. A stored field's value starts empty
 * and keeps the stored value while it stays empty.
 */
export function SecretFieldList({
  secretName,
  fields,
  onChange,
  needsEveryValue,
  problem,
}: {
  secretName: string
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
    <section className="@container space-y-3" aria-labelledby="secret-fields">
      <SectionHeading
        as="h3"
        title={<span id="secret-fields">Campos</span>}
        count={fields.length}
        action={
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
        }
      />

      <div className="rounded-lg border">
        <div className={`${ROW} border-b px-3 py-2`} aria-hidden>
          <Text variant="label" tone="muted">
            Campo
          </Text>
          <Text variant="label" tone="muted">
            Valor
          </Text>
          <Text variant="label" tone="muted" className="hidden @xl:block">
            Marcador
          </Text>
        </div>
        <ul className="divide-y">
          {fields.map((field, index) => (
            <li key={field.key} className={`${ROW} px-3 py-2`}>
              <Input
                aria-label={`Nombre del campo ${index + 1}`}
                value={field.name}
                onChange={(event) =>
                  update(field.key, { name: event.target.value })
                }
                placeholder="key"
                className="font-mono"
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
              />
              <Text
                variant="data"
                tone="muted"
                className="hidden truncate select-all @xl:block"
              >
                {placeholderOf(secretName, field.name)}
              </Text>
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
      </div>

      {problem !== undefined && (
        <Text as="p" variant="meta" tone="destructive" role="alert">
          {problem}
        </Text>
      )}
      <Text as="p" variant="meta" tone="muted">
        Los valores no se vuelven a mostrar. En las respuestas se tachan como
        [secret:nombre.campo], salvo los de menos de 4 caracteres.
      </Text>
    </section>
  )
}
