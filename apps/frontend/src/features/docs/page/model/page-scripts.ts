import { setupCopyButtons } from "@/features/docs/page/model/page-scripts/copy-code"
import { setupCopyMarkdown } from "@/features/docs/page/model/page-scripts/copy-markdown"
import { setupWidthToggle } from "@/features/docs/page/model/page-scripts/reading-width"
import { setupSearchHighlight } from "@/features/docs/page/model/page-scripts/search-highlight"
import { setupSyncButton } from "@/features/docs/page/model/page-scripts/sync-button"
import { setupTableOfContents } from "@/features/docs/page/model/page-scripts/table-of-contents"

// Browser behavior of a documentation page, set up once for the whole
// session: the router swaps pages in, so everything listens on the document
// and rereads the page on `astro:page-load`.

import { setupDiagramHighlights } from "@/features/docs/diagrams"

let started = false

/**
 * Sets up the page's buttons, table of contents and diagram highlighting,
 * once. The tables are the `DocTables` island's (`features/docs/tables`).
 */
export function onDocsPageLoad() {
  if (started) return
  started = true
  setupCopyButtons()
  setupCopyMarkdown()
  setupWidthToggle()
  setupSyncButton()
  setupTableOfContents()
  setupDiagramHighlights()
  setupSearchHighlight()
}
