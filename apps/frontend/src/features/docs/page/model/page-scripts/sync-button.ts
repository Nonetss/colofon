import { COPIED_MS } from "@/features/docs/page/model/page-scripts/copy-code"
import { navigate } from "@/lib/navigate"
import { client, orpc } from "@/lib/orpc"
import { getQueryClient } from "@/lib/query-client"

// The sync button an admin sees: syncs the page's repository now and
// reloads the page when it is done.

const SYNC_LABEL = "Sincronizar repositorio"

function syncedLabel(done: boolean): string {
  if (done) return "Sincronizado"
  return "No se pudo sincronizar"
}

/**
 * The admins' sync button fetches the page's repository now; once synced the
 * router reloads the page so it shows the new content, and the persisted
 * sidebar refetches its navigation (it keeps the one it was rendered with).
 */
export function setupSyncButton() {
  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest("[data-sync-repository]")
    if (!(button instanceof HTMLButtonElement)) return
    const slug = button.dataset.syncRepository
    if (slug === undefined || button.disabled) return
    const label = button.querySelector("[data-sync-label]")
    button.disabled = true
    if (label !== null) label.textContent = "Sincronizando…"
    let done = true
    try {
      await client.v1.content.syncRepository({ slug })
    } catch {
      done = false
    }
    button.disabled = false
    if (label !== null) label.textContent = syncedLabel(done)
    button.toggleAttribute("data-done", done)
    button.toggleAttribute("data-failed", !done)
    if (done) {
      void getQueryClient().invalidateQueries({
        queryKey: orpc.v1.docs.key(),
      })
      navigate(`${window.location.pathname}${window.location.search}`)
    }
    setTimeout(() => {
      if (label !== null) label.textContent = SYNC_LABEL
      button.removeAttribute("data-done")
      button.removeAttribute("data-failed")
    }, COPIED_MS)
  })
}
