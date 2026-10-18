// The "Copiar" button on each code block: copies the block's text and
// shows a check for a moment.

export const COPIED_MS = 1500

/** The `pre` text of the code frame holding `button`. */
function codeOf(button: Element): string {
  const pre = button.closest(".doc-code")?.querySelector("pre")
  if (pre === null || pre === undefined) return ""
  if (!(pre instanceof HTMLElement)) return ""
  return pre.innerText
}

const COPY_HINT = "Copiar"

/**
 * The copy button of a code frame is an icon: the outcome shows in its hint,
 * kept open meanwhile, and a check replaces the icon once copied
 * (`data-copy-state`).
 */
export function setupCopyButtons() {
  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest("[data-copy]")
    if (!(button instanceof HTMLElement)) return
    try {
      await navigator.clipboard.writeText(codeOf(button))
      button.dataset.copyState = "done"
      button.dataset.hint = "Copiado"
    } catch {
      button.dataset.copyState = "failed"
      button.dataset.hint = "No se pudo copiar"
    }
    setTimeout(() => {
      delete button.dataset.copyState
      button.dataset.hint = COPY_HINT
    }, COPIED_MS)
  })
}
