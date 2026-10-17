import { textVariants } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  fromSelectValue,
  pathOptions,
  toSelectValue,
} from "@/features/content-repositories/manage/model/path-options"
import { cn } from "@/lib/utils"

const FIELD_ID = "content-repository-path"

/** What a form knows of the repository's content folders while it reads them. */
export interface FoldersListing {
  data: { folders: string[] } | undefined
  isFetching: boolean
  isError: boolean
  error: Error | null
}

interface ContentPathFieldProps {
  value: string
  onChange: (path: string) => void
  /** The folders of the repository, once the form can read them. */
  folders: FoldersListing
}

function textHint(folders: FoldersListing): string {
  if (folders.isFetching) return "Buscando las carpetas del repositorio…"
  if (folders.isError) {
    return `No se pudieron leer las carpetas (${folders.error?.message ?? "error desconocido"}); escríbela a mano.`
  }
  return "Opcional. Déjala vacía si doc.config.yaml está en la raíz del repositorio; si no, escribe su carpeta, por ejemplo docs."
}

/**
 * The folder of the git repository where the content lives: a select of the
 * folders that hold a doc.config.yaml once they can be read, and a text
 * field while they can't (no repository yet, still reading, a remote that
 * refused, or none found).
 */
export function ContentPathField({
  value,
  onChange,
  folders,
}: ContentPathFieldProps) {
  const found = folders.data?.folders

  if (found !== undefined && found.length > 0) {
    const options = pathOptions(found, value)
    return (
      <FormField
        label="Carpeta del contenido"
        htmlFor={FIELD_ID}
        hint="Las carpetas del repositorio que tienen un doc.config.yaml en la rama elegida."
      >
        <Select
          items={options}
          value={toSelectValue(value)}
          onValueChange={(next) => {
            if (next !== null) onChange(fromSelectValue(next))
          }}
        >
          <SelectTrigger
            id={FIELD_ID}
            className={cn("w-full", textVariants({ role: "data" }))}
          >
            <SelectValue>
              {
                options.find((option) => option.value === toSelectValue(value))
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                label={option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    )
  }

  return (
    <FormField
      label="Carpeta del contenido"
      htmlFor={FIELD_ID}
      hint={textHint(folders)}
    >
      <Input
        id={FIELD_ID}
        maxLength={255}
        placeholder="docs"
        pattern="[^/.][^/]*(/[^/.][^/]*)*"
        className={textVariants({ role: "data" })}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}
