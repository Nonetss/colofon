import { cn } from "@/lib/utils"

export interface AppLogoProps {
  alt: string
  className?: string
  size?: number
}

/**
 * Application mark, independent from navigation, session and page state.
 * An empty `alt` marks it as decoration, hidden from assistive tech.
 *
 * Drawn inline so the ink layers follow the active theme (`foreground`) and
 * the top layer keeps the brand accent (`primary`). The geometry mirrors
 * `src/assets/logo.svg`, which stays the standalone file for the favicon.
 */
export function AppLogo({ alt, className, size = 32 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={alt}
      aria-hidden={alt === ""}
    >
      <rect
        x="6"
        y="42"
        width="36"
        height="12"
        rx="3"
        className="fill-foreground"
      />
      <rect
        x="14"
        y="26"
        width="36"
        height="12"
        rx="3"
        className="fill-foreground"
      />
      <rect
        x="22"
        y="10"
        width="36"
        height="12"
        rx="3"
        className="fill-primary"
      />
    </svg>
  )
}
