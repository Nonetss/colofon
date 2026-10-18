import { textVariants } from "@/components/shared/brand/typography"
import { cn } from "@/lib/utils"

const SELECTED = "bg-foreground text-background"
const IDLE = "text-muted-foreground hover:bg-muted/40 hover:text-foreground"

export interface SurfaceSearchScopeProps {
  /** Name of the repository the reader's scope names. */
  repository: string
  /** Whether the dialog searches every repository instead. */
  everywhere: boolean
  onChange: (everywhere: boolean) => void
}

/**
 * Where the search looks, inside the search field's row: the scope's
 * repository or every repository. Dressed like `SegmentedPicker`'s cells at
 * the row's size. Its options stay out of the tab order because Tab in the
 * field already switches between them.
 */
export function SurfaceSearchScope({
  repository,
  everywhere,
  onChange,
}: SurfaceSearchScopeProps) {
  const options = [
    { label: repository, selected: !everywhere, value: false },
    { label: "Todos", selected: everywhere, value: true },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Dónde buscar (Tab para cambiar)"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-input p-0.5"
    >
      {options.map((option) => {
        const tone = option.selected ? SELECTED : IDLE
        return (
          // biome-ignore lint/a11y/useSemanticElements: native radios cannot carry this compact cell treatment.
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.selected}
            tabIndex={-1}
            onClick={() => onChange(option.value)}
            className={cn(
              textVariants({ role: "compact" }),
              "h-6 max-w-32 truncate rounded-sm px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              tone
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
