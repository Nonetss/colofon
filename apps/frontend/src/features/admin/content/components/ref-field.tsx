import { useEffect } from "react"
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
import { useContentRepositoryBranches } from "@/features/admin/content/hooks/use-content-repositories"
import {
  branchesSource,
  refOptions,
  suggestedBranch,
} from "@/features/admin/content/model/branches-source"
import type {
  ContentRepository,
  RepositorySource,
} from "@/features/admin/content/model/types"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { cn } from "@/lib/utils"

const FIELD_ID = "content-repository-ref"
const URL_DEBOUNCE_MS = 500

interface RefFieldProps {
  open: boolean
  /** The repository being edited, or `null` when creating one. */
  repository: ContentRepository | null
  /** Where the repository's history lives, as chosen in the form. */
  source: RepositorySource
  /** The URL field as typed; its branches are read once it is complete. */
  url: string
  value: string
  /** The user picked or typed a ref. */
  onChange: (ref: string) => void
  /** The remote's default branch, offered while the user hasn't chosen. */
  onSuggest: (ref: string) => void
  /** Whether the user already chose a ref, so a suggestion never replaces it. */
  chosen: boolean
}

/**
 * The ref of a content repository: a select of the remote's branches once
 * they can be read, and a text field while they can't (no URL yet, still
 * loading, or the remote refused), where a tag or a commit can be typed.
 */
export function RefField({
  open,
  repository,
  source,
  url,
  value,
  onChange,
  onSuggest,
  chosen,
}: RefFieldProps) {
  const debouncedUrl = useDebouncedValue(url.trim(), URL_DEBOUNCE_MS)
  const branches = useContentRepositoryBranches(
    branchesSource(open, repository, source, debouncedUrl)
  )
  const data = branches.data

  useEffect(() => {
    if (data === undefined || chosen) return
    if (data.branches.includes(value)) return
    const suggested = suggestedBranch(data)
    if (suggested !== undefined) onSuggest(suggested)
  }, [data, chosen, value, onSuggest])

  if (data !== undefined && data.branches.length > 0) {
    const options = refOptions(data.branches, value).map((ref) => ({
      value: ref,
      label: ref,
    }))
    return (
      <FormField
        label="Rama"
        htmlFor={FIELD_ID}
        hint="Las ramas del repositorio; se descarga la que elijas."
      >
        <Select
          items={options}
          value={value}
          onValueChange={(next) => {
            if (next !== null) onChange(next)
          }}
        >
          <SelectTrigger
            id={FIELD_ID}
            className={cn("w-full", textVariants({ role: "data" }))}
          >
            <SelectValue>{value}</SelectValue>
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
    <FormField label="Ref" htmlFor={FIELD_ID} hint={refHint(source, branches)}>
      <Input
        id={FIELD_ID}
        required
        maxLength={255}
        className={textVariants({ role: "data" })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}

function refHint(
  source: RepositorySource,
  branches: {
    isFetching: boolean
    isError: boolean
    error: Error | null
  }
): string {
  if (branches.isFetching) return "Leyendo las ramas del repositorio…"
  if (source === "hosted") {
    return "Rama que se publica: cada push a ella actualiza el contenido."
  }
  if (branches.isError) {
    return `No se pudieron leer las ramas (${branches.error?.message ?? "error desconocido"}); escribe la rama, el tag o el commit.`
  }
  return "Rama, tag o commit que se descarga. Con la URL completa, se elige de una lista."
}
