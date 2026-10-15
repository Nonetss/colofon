import { useCallback, useEffect, useState } from "react"
import {
  type GitLocation,
  hrefOf,
  parseLocation,
} from "@/features/admin/git-repository/model/git-location"

/**
 * The git browser's location, kept in the page's URL. `navigate` adds a
 * history entry, so the back button walks back through what was opened;
 * `replace` corrects the current one (a folder that no longer exists) without
 * adding one. Back/forward and Astro page loads resync it from the URL.
 */
export function useGitLocation() {
  const [location, setLocation] = useState<GitLocation>(() =>
    parseLocation(window.location.search)
  )

  useEffect(() => {
    const sync = () => setLocation(parseLocation(window.location.search))
    window.addEventListener("popstate", sync)
    document.addEventListener("astro:page-load", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      document.removeEventListener("astro:page-load", sync)
    }
  }, [])

  const navigate = useCallback((next: GitLocation) => {
    setLocation(next)
    const href = hrefOf(window.location.href, next)
    if (href === window.location.href) return
    window.history.pushState(window.history.state, "", href)
  }, [])

  const replace = useCallback((next: GitLocation) => {
    setLocation(next)
    window.history.replaceState(
      window.history.state,
      "",
      hrefOf(window.location.href, next)
    )
  }, [])

  return { location, navigate, replace }
}
