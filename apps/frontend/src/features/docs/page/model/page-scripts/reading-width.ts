// The reading width toggle: full width or the reading column, remembered
// in this browser.

const WIDTH_STORAGE_KEY = "docs-width"
const FULL_WIDTH_ATTRIBUTE = "data-reading-width-full"
/** Reading width (the default) or the whole screen, remembered. */
export function setupWidthToggle() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return
    if (event.target.closest("[data-width-toggle]") === null) return
    const full = document.documentElement.toggleAttribute(FULL_WIDTH_ATTRIBUTE)
    try {
      if (full) localStorage.setItem(WIDTH_STORAGE_KEY, "full")
      else localStorage.removeItem(WIDTH_STORAGE_KEY)
    } catch {
      // Without storage the width still changes, just for this visit.
    }
  })
}
