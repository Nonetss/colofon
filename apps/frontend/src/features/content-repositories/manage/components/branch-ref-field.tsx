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
import {
  refOptions,
  suggestedBranch,
} from "@/features/content-repositories/manage/model/ref-options"
import { cn } from "@/lib/utils"

const FIELD_ID = "content-repository-ref"

/** What a form knows of the remote's branches while it reads them. */
export interface BranchListing {
  data: { branches: string[]; defaultBranch: string | null } | undefined
  isFetching: boolean
  isError: boolean
  error: Error | null
}

interface BranchRefFieldProps {
  branches: BranchListing
  value: string
  /** The user picked or typed a ref. */
  onChange: (ref: string) => void
  /** The remote's default branch, offered while the user hasn't chosen. */
  onSuggest: (ref: string) => void
  /** Whether the user already chose a ref, so a suggestion never replaces it. */
  chosen: boolean
  /** What to say under the text field while the branches can't be listed. */
  textHint: string
}

/**
 * The ref of a content repository: a select of the remote's branches once
 * they can be read, and a text field while they can't (no URL yet, still
 * loading, or the remote refused), where a tag or a commit can be typed.
 */
export function BranchRefField({
  branches,
  value,
  onChange,
  onSuggest,
  chosen,
  textHint,
}: BranchRefFieldProps) {
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
    <FormField
      label="Ref"
      htmlFor={FIELD_ID}
      hint={
        branches.isFetching ? "Leyendo las ramas del repositorio…" : textHint
      }
    >
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
