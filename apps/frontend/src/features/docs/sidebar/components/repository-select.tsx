import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DocsRepository } from "@/features/docs/shared/model/nav"
import {
  ALL_SCOPE,
  type DocsScope,
  scopeValue,
} from "@/features/docs/shared/model/scope"

export interface RepositorySelectProps {
  repositories: readonly DocsRepository[]
  scope: DocsScope
  onChange: (value: string) => void
}

/** "Todos" plus every repository by name, at the top of the sidebar. */
export function RepositorySelect({
  repositories,
  scope,
  onChange,
}: RepositorySelectProps) {
  const items = [
    { value: ALL_SCOPE, label: "Todos" },
    ...repositories.map((repository) => ({
      value: repository.slug,
      label: repository.name,
    })),
  ]
  const value = scopeValue(scope)
  const current = items.find((item) => item.value === value)
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger aria-label="Repositorio" className="w-full">
        <SelectValue>{current?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} label={item.label}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
