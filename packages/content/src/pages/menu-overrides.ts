import type { PageProblem } from "#contract/read/problems"
import type { ContractVersion } from "#contract/versions/detect"
import { contractKey } from "#contract/versions/v1"
import { fallbackTitleOf, type Page, type PageHeader } from "#pages/page"

// What menu.yaml says about an entry wins over the page's own header: the
// title and icon of its entry replace the header's everywhere, and a header
// that says something else is reported, so nobody edits a value never shown.

/** What a menu entry sets about the page or section it names. */
export type MenuOverride = { title: string | null; icon: string | null }

/** A page whose header the menu can override, with the file it reports on. */
type OverridablePage = {
  path: string
  contentFile: string
  header: PageHeader
  problems: PageProblem[]
}

/**
 * A page with the title and icon its menu entry gives (the YAML wins), and a
 * problem for each header value the menu overrides with another one.
 */
export function withOverride<T extends OverridablePage>(
  page: T,
  overrides: ReadonlyMap<string, MenuOverride>,
  contract: ContractVersion
): T {
  const override = overrides.get(page.path)
  if (override === undefined) return page
  const problems = [...page.problems]
  const report = (message: string) =>
    problems.push({ file: page.contentFile, line: null, message })
  const { header } = page
  if (
    override.title !== null &&
    header.title !== override.title &&
    header.title !== fallbackTitleOf(page.path)
  )
    report(
      `${contractKey(contract, "title")}: la cabecera dice «${header.title}», pero manda menu.yaml («${override.title}»)`
    )
  if (
    override.icon !== null &&
    header.icon !== null &&
    header.icon !== override.icon
  )
    report(
      `${contractKey(contract, "icon")}: la cabecera dice \`${header.icon}\`, pero manda menu.yaml (\`${override.icon}\`)`
    )
  return { ...page, header: applyOverride(header, override), problems }
}

export function overridden(
  page: Page,
  overrides: ReadonlyMap<string, MenuOverride>
): Page {
  const override = overrides.get(page.path)
  if (override === undefined) return page
  return { ...page, header: applyOverride(page.header, override) }
}

function applyOverride(header: PageHeader, override: MenuOverride): PageHeader {
  return {
    ...header,
    title: titleFrom(override, header.title),
    icon: overriddenIcon(header, override),
  }
}

/** The title an override gives, or `fallback` when it gives none. */
export function titleFrom(
  override: MenuOverride | undefined,
  fallback: string
): string {
  if (override === undefined || override.title === null) return fallback
  return override.title
}

function overriddenIcon(
  header: PageHeader,
  override: MenuOverride
): string | null {
  if (override.icon === null) return header.icon
  return override.icon
}
