// The "En esta página" list: marks the section being read as the page
// scrolls.

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

export function setupTableOfContents() {
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
