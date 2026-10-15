// Browser behavior of a documentation page, set up once for the whole
// session: the router swaps pages in, so everything listens on the document
// and rereads the page on `astro:page-load`.

import { withOrigin } from "@/features/docs/page/model/full-links"
import { mountTables } from "@/features/docs/page/model/interactive-tables"

const COPIED_MS = 1500

/** The `pre` text of the code frame holding `button`. */
function codeOf(button: Element): string {
  const pre = button.closest(".doc-code")?.querySelector("pre")
  if (pre === null || pre === undefined) return ""
  if (!(pre instanceof HTMLElement)) return ""
  return pre.innerText
}

function setupCopyButtons() {
  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest("[data-copy]")
    if (button === null) return
    try {
      await navigator.clipboard.writeText(codeOf(button))
      button.textContent = "Copiado"
    } catch {
      button.textContent = "No se pudo copiar"
    }
    setTimeout(() => {
      button.textContent = "Copiar"
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

let started = false

/** Sets up the page's buttons, tables and table of contents, once. */
export function onDocsPageLoad() {
  if (started) return
  started = true
  document.addEventListener("astro:page-load", mountTables)
  setupCopyButtons()
  setupCopyMarkdown()
  setupWidthToggle()
  setupTableOfContents()
}
