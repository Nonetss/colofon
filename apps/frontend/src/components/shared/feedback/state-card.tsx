import type { ReactNode } from "react"
import { surfaceVariants } from "@/components/shared/brand/surface"
import { Text } from "@/components/shared/brand/typography"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const Loader2 = getIcon("status", "loading")

/**
 * Shared full-width state: loading spinners, empty states, errors and
 * success screens, with the dashboard's entrance motion.
 */
export function StateCard({
  icon,
  spinner = false,
  title,
  description,
  action,
  tone = "muted",
  className,
}: {
  icon?: ReactNode
  spinner?: boolean
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  tone?: "muted" | "destructive" | "celebrate"
  className?: string
}) {
  const titleVariant = tone === "celebrate" ? "display" : "headline"

  return (
    <div
      className={cn(
        "dash-enter relative flex flex-col items-center gap-3 overflow-hidden border-dashed px-6 py-16 text-center",
        surfaceVariants(),
        tone === "celebrate" && "border-solid",
        className
      )}
    >
      {spinner ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : icon ? (
        <div
          className={cn(
            "dash-pop flex size-10 items-center justify-center text-muted-foreground",
            tone === "destructive" && "text-destructive",
            tone === "celebrate" && "text-primary"
          )}
        >
          {icon}
        </div>
      ) : null}

      <div className="relative">
        <Text
          as="p"
          variant={titleVariant}
          className={cn(tone === "destructive" && "text-destructive")}
        >
          {title}
        </Text>
        {description ? (
          <Text
            as="p"
            variant="body"
            tone="muted"
            className="mx-auto mt-1 max-w-sm leading-relaxed"
          >
            {description}
          </Text>
        ) : null}
      </div>
      {action ? <div className="relative mt-1">{action}</div> : null}
    </div>
  )
}
