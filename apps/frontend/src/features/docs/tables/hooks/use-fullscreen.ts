import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Full screen: the table's box moves into a dialog while it is open and
 * back to its place before the dialog closes, so nothing of it is lost.
 */
export function useFullscreen(box: HTMLElement) {
  const [open, setOpen] = useState(false)
  const placeholder = useRef<Comment | null>(null)

  const restore = useCallback(() => {
    const marker = placeholder.current
    if (marker === null) return
    marker.replaceWith(box)
    placeholder.current = null
    box.scrollIntoView({ block: "nearest" })
  }, [box])

  const hold = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null || placeholder.current !== null) return
      const marker = document.createComment("tabla")
      box.before(marker)
      placeholder.current = marker
      node.append(box)
    },
    [box]
  )

  const change = useCallback(
    (next: boolean) => {
      if (!next) restore()
      setOpen(next)
    },
    [restore]
  )

  useEffect(() => restore, [restore])
  return { open, change, hold }
}
