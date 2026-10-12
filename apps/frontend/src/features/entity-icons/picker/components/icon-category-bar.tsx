import { Hint } from "@/components/shared/feedback/hint"
import { Button, buttonVariants } from "@/components/ui/button"
import { useHorizontalScroll } from "@/features/entity-icons/picker/hooks/use-horizontal-scroll"
import type { IconCategoryId } from "@/features/entity-icons/picker/model/icon-categories.generated"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ChevronLeft = getIcon("controls", "chevronLeft")
const ChevronRight = getIcon("controls", "chevronRight")

interface IconCategoryBarProps {
  categories: { id: IconCategoryId; title: string }[]
  active: IconCategoryId | null
  onChange: (category: IconCategoryId | null) => void
}

export function IconCategoryBar({
  categories,
  active,
  onChange,
}: IconCategoryBarProps) {
  const { ref, canScrollLeft, canScrollRight, scrollBy } =
    useHorizontalScroll<HTMLDivElement>()
  const hasOverflow = canScrollLeft || canScrollRight

  const chip = (isActive: boolean) =>
    cn(
      buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "xs" }),
      "shrink-0",
      !isActive && "text-muted-foreground"
    )

  return (
    <div className="flex items-center gap-1">
      {hasOverflow ? (
        <Hint label="Categorías anteriores">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Categorías anteriores"
            disabled={!canScrollLeft}
            onClick={() => scrollBy(-1)}
            className="shrink-0"
          >
            <ChevronLeft aria-hidden />
          </Button>
        </Hint>
      ) : null}
      <div
        ref={ref}
        role="toolbar"
        aria-label="Categorías"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        <button
          type="button"
          aria-pressed={active === null}
          className={chip(active === null)}
          onClick={() => onChange(null)}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={active === category.id}
            className={chip(active === category.id)}
            onClick={() => onChange(category.id)}
          >
            {category.title}
          </button>
        ))}
      </div>
      {hasOverflow ? (
        <Hint label="Más categorías">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Más categorías"
            disabled={!canScrollRight}
            onClick={() => scrollBy(1)}
            className="shrink-0"
          >
            <ChevronRight aria-hidden />
          </Button>
        </Hint>
      ) : null}
    </div>
  )
}
