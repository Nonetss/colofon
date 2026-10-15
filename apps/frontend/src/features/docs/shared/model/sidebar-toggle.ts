// The navbar and the documentation sidebar are separate islands: the
// navbar's menu button asks the sidebar to open through a window event, and
// shows only on pages whose layout marks <body> as having the sidebar.

/** Window event that opens or closes the documentation sidebar's sheet. */
export const DOCS_SIDEBAR_TOGGLE_EVENT = "docs-sidebar:toggle"

/** Attribute `Docs.astro` sets on <body>. */
export const DOCS_SIDEBAR_ATTRIBUTE = "data-docs-sidebar"

export function toggleDocsSidebar() {
  window.dispatchEvent(new Event(DOCS_SIDEBAR_TOGGLE_EVENT))
}

/** Whether the current page has the documentation sidebar. */
export function hasDocsSidebar(): boolean {
  return document.body.hasAttribute(DOCS_SIDEBAR_ATTRIBUTE)
}
