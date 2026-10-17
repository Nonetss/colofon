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
 * Drawn inline so the letter follows the active theme (`foreground`) and
 * the full stop keeps the brand accent (`primary`). The geometry mirrors
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
      <path
        d="M42.55 19.14A19 20 0 1 0 42.55 44.86L36.43 42.29A11 16 0 1 1 36.43 21.71L42.55 19.14ZM36.43 21.71L42.55 19.14L45 26.5L39.5 26.5Z"
        className="fill-foreground"
      />
      <circle cx="50" cy="44" r="4.5" className="fill-primary" />
    </svg>
  )
}
