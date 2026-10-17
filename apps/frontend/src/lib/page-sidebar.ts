// The navbar and a page's sidebar (the documentation one or a section's) are
// separate islands: the navbar's menu button asks the sidebar to open through
// a window event, and shows only on pages whose layout marks <body> with the
// sidebar's element id.

/** Window event that opens or closes the page sidebar's sheet. */
export const PAGE_SIDEBAR_TOGGLE_EVENT = "page-sidebar:toggle"

/** Attribute a layout sets on <body>, holding its sidebar's element id. */
export const PAGE_SIDEBAR_ATTRIBUTE = "data-page-sidebar"

export function togglePageSidebar() {
  window.dispatchEvent(new Event(PAGE_SIDEBAR_TOGGLE_EVENT))
}

/** The element id of the current page's sidebar, or null without one. */
export function pageSidebarId(): string | null {
  const id = document.body.getAttribute(PAGE_SIDEBAR_ATTRIBUTE)
  if (id === null || id === "") return null
  return id
}
