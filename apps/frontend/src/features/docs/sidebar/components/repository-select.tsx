import { SearchableCombobox } from "@/components/ui/searchable-combobox"
import type { DocsRepository } from "@/features/docs/shared/public"
import {
  ALL_SCOPE,
  type DocsScope,
  scopeValue,
} from "@/features/docs/shared/public"

export interface RepositorySelectProps {
  repositories: readonly DocsRepository[]
  scope: DocsScope
  onChange: (value: string) => void
}

/**
 * "Todos" plus every repository by name, searchable, at the top of the
 * sidebar; one shared with the user names the organization it comes from.
 */
export function RepositorySelect({
  repositories,
  scope,
  onChange,
}: RepositorySelectProps) {
  const options = repositories.map((repository) => ({
    value: repository.slug,
    label: repository.name,
    detail: repository.sharedBy ?? undefined,
  }))
  const value = scopeValue(scope)
  return (
    <SearchableCombobox
      options={options}
      value={value === ALL_SCOPE ? undefined : value}
      onChange={(next) => onChange(next ?? ALL_SCOPE)}
      placeholder="Todos"
      searchPlaceholder="Buscar repositorio…"
      allLabel="Todos"
      aria-label="Repositorio"
      className="w-full max-w-none"
    />
  )
}
