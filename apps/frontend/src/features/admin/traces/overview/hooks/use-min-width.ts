import { useLayoutEffect, useState } from "react"

/**
 * Whether `element` is at least `minRem` wide, kept in step with its size.
 * For layouts that swap components rather than classes (a panel beside the
 * list vs a sheet over it), so they follow the element's width the way a
 * container query would. `false` until the element mounts; the first
 * measure lands before paint.
 */
export function useMinWidth(element: HTMLElement | null, minRem: number) {
  const [wide, setWide] = useState(false)

  useLayoutEffect(() => {
    if (element === null) return
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const minPx = minRem * rootFontSize
    const measure = () => setWide(element.clientWidth >= minPx)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, minRem])

  return wide
}
