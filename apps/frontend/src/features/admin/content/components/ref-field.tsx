import { useContentRepositoryBranches } from "@/features/admin/content/hooks/use-content-repositories"
import { branchesSource } from "@/features/admin/content/model/branches-source"
import type {
  ContentRepository,
  RepositorySource,
} from "@/features/admin/content/model/types"
import { BranchRefField } from "@/features/content-repositories/manage"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

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
 * The ref of a repository in the admin form: the branches come from the typed
 * URL, the stored repository or the hosted one.
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
  return (
    <BranchRefField
      branches={branches}
      value={value}
      onChange={onChange}
      onSuggest={onSuggest}
      chosen={chosen}
      textHint={refHint(source, branches)}
    />
  )
}

function refHint(
  source: RepositorySource,
  branches: { isError: boolean; error: Error | null }
): string {
  if (source === "hosted") {
    return "Rama que se publica: cada push a ella actualiza el contenido."
  }
  if (branches.isError) {
    return `No se pudieron leer las ramas (${branches.error?.message ?? "error desconocido"}); escribe la rama, el tag o el commit.`
  }
  return "Rama, tag o commit que se descarga. Con la URL completa, se elige de una lista."
}
