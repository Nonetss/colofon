// Browser behavior of a documentation page, set up once for the whole
// session: the router swaps pages in, so everything listens on the document
// and rereads the page on `astro:page-load`.

import { withOrigin } from "@nonete/api/v1/docs/full-links"
import { setupDiagramHighlights } from "@/features/docs/diagrams"
import { navigate } from "@/lib/navigate"
import { client, orpc } from "@/lib/orpc"
import { getQueryClient } from "@/lib/query-client"
import { highlightRanges, takeSearchHighlight } from "@/lib/search-highlight"

const COPIED_MS = 1500

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
function setupCopyButtons() {
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

const COPY_MD_LABEL = "Copiar en Markdown"
const WIDTH_STORAGE_KEY = "docs-width"
const FULL_WIDTH_ATTRIBUTE = "data-reading-width-full"

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

function setupCopyMarkdown() {
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

/** Reading width (the default) or the whole screen, remembered. */
function setupWidthToggle() {
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
function setupSyncButton() {
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

/** Pixels from the top of the window where reading happens. */
function readingLine(): number {
  const navbar = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--navbar-height"
    )
  )
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  )
  return navbar * rem + 2 * rem
}

function setupTableOfContents() {
  let links: HTMLAnchorElement[] = []
  let targets: HTMLElement[] = []
  let ticking = false

  const update = () => {
    ticking = false
    const [first] = targets
    if (first === undefined) return
    const line = readingLine()
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4
    let current = first
    for (const target of targets) {
      if (target.getBoundingClientRect().top <= line) current = target
    }
    const last = targets.at(-1)
    if (atBottom && last !== undefined) current = last
    for (const link of links)
      link.toggleAttribute("data-current", link.dataset.toc === current.id)
  }

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    },
    { passive: true }
  )

  document.addEventListener("astro:page-load", () => {
    links = [...document.querySelectorAll<HTMLAnchorElement>("[data-toc]")]
    targets = []
    for (const link of links) {
      const target = document.getElementById(link.dataset.toc ?? "")
      if (target !== null) targets.push(target)
    }
    update()
  })
}

/** Name of the highlight that marks the searched words (`::highlight()`). */
const SEARCH_HIGHLIGHT = "search-match"

/** The level of a section heading the reader links to, `null` for others. */
function headingLevel(element: Element): number | null {
  if (element.tagName === "H2") return 2
  if (element.tagName === "H3") return 3
  return null
}

/**
 * Where the searched words are highlighted: from the heading `id` names up
 * to the next heading of the same or a higher level, or the whole body.
 */
function highlightScope(body: Element, id: string): Range {
  const range = document.createRange()
  range.selectNodeContents(body)
  const heading = id === "" ? null : document.getElementById(id)
  if (heading === null || !body.contains(heading)) return range
  const level = headingLevel(heading)
  if (level === null) return range
  range.setStartBefore(heading)
  const headings = [...body.querySelectorAll("h2, h3")]
  const after = headings.slice(headings.indexOf(heading) + 1)
  const next = after.find((other) => {
    const otherLevel = headingLevel(other)
    return otherLevel !== null && otherLevel <= level
  })
  if (next !== undefined) range.setEndBefore(next)
  return range
}

/** The ranges of the words in `scope` that start with one of `terms`. */
function matchRanges(scope: Range, terms: readonly string[]): Range[] {
  const ranges: Range[] = []
  const walker = document.createTreeWalker(
    scope.commonAncestorContainer,
    NodeFilter.SHOW_TEXT
  )
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!scope.intersectsNode(node)) continue
    for (const { start, end } of highlightRanges(
      node.textContent ?? "",
      terms
    )) {
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      ranges.push(range)
    }
  }
  return ranges
}

function hashId(): string {
  const id = location.hash.slice(1)
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

/**
 * Highlights the words a navbar search found on the page it opened, in the
 * section it pointed at, without touching the markup (CSS Custom Highlight
 * API; browsers without it show none). It lasts until the page is left.
 */
function setupSearchHighlight() {
  document.addEventListener("astro:page-load", () => {
    const terms = takeSearchHighlight(location.pathname + location.hash)
    const body = document.querySelector(".typeset-docs")
    if (terms.length === 0 || body === null) return
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return
    const ranges = matchRanges(highlightScope(body, hashId()), terms)
    if (ranges.length > 0)
      CSS.highlights.set(SEARCH_HIGHLIGHT, new Highlight(...ranges))
  })
  document.addEventListener("astro:before-swap", () => {
    if (typeof CSS !== "undefined" && "highlights" in CSS)
      CSS.highlights.delete(SEARCH_HIGHLIGHT)
  })
}

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
