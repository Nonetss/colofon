// Browser behavior of a documentation page, set up once for the whole
// session: the router swaps pages in, so everything listens on the document
// and rereads the page on `astro:page-load`.

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

/** Sets up the copy buttons and the table of contents, once. */
export function onDocsPageLoad() {
  if (started) return
  started = true
  setupCopyButtons()
  setupTableOfContents()
}
