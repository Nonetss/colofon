import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const Loader2Icon = getIcon("status", "loading")

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
