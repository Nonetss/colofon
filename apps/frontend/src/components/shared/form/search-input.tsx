import { getIcon } from "@/lib/icon-registry"

const Search = getIcon("views", "search")

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SearchInput({
  id,
  value,
  onValueChange,
  placeholder,
  label,
  className,
}: {
  id?: string
  /** Accessible name when no visible `<label>` points at the input. */
  label?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 pl-8"
      />
    </div>
  )
}
