import { withOrigin } from "@nonete/api/v1/docs/full-links"
import { COPIED_MS } from "@/features/docs/page/model/page-scripts/copy-code"

// The "Copiar en Markdown" button: the page's Markdown, its reader routes
// made full addresses, on the clipboard.

const COPY_MD_LABEL = "Copiar en Markdown"

/** The page's Markdown, its reader routes made full addresses to paste. */
function pageMarkdown(): string {
  const source = document.getElementById("page-markdown")?.textContent
  if (source === undefined || source === null || source === "") return ""
  const markdown: unknown = JSON.parse(source)
  if (typeof markdown !== "string") return ""
  return withOrigin(markdown, window.location.origin)
}

function copiedLabel(done: boolean): string {
  if (done) return "Copiado"
  return "No se pudo copiar"
}

export function setupCopyMarkdown() {
  let timer: number | undefined
  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest("[data-copy-md]")
    if (button === null) return
    const label = button.querySelector("[data-copy-md-label]")
    let done = true
    try {
      await navigator.clipboard.writeText(pageMarkdown())
    } catch {
      done = false
    }
    if (label !== null) label.textContent = copiedLabel(done)
    button.toggleAttribute("data-done", done)
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (label !== null) label.textContent = COPY_MD_LABEL
      button.removeAttribute("data-done")
    }, COPIED_MS)
  })
}
