import { slugOf } from "@/features/docs/tables/model/table-view"

// A table's view taken out of the page: as CSV for Excel, or as a GitHub
// table in Markdown with its links as full addresses. Both hold the visible
// columns of every filtered row, every page included.

function csvField(text: string): string {
  if (!/[;"\n\r]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

/**
 * CSV for Excel in Spanish: `;` between fields, CRLF lines and a BOM, so it
 * reads the accents as UTF-8.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string {
  const lines = [headers, ...rows].map((fields) =>
    fields.map(csvField).join(";")
  )
  return `﻿${lines.join("\r\n")}\r\n`
}

function escapeCell(text: string): string {
  return text.replace(/\s+/g, " ").replaceAll("|", "\\|")
}

function absolute(href: string, origin: string): string {
  try {
    return new URL(href, origin).toString()
  } catch {
    return href
  }
}

/** A cell's content as inline Markdown: links made absolute, code kept. */
export function cellMarkdown(cell: Node, origin: string): string {
  let text = ""
  for (const node of cell.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += escapeCell(node.textContent ?? "")
      continue
    }
    if (!(node instanceof Element)) continue
    const inner = cellMarkdown(node, origin)
    const tag = node.tagName.toLowerCase()
    const href = node.getAttribute("href")
    if (tag === "a" && href !== null)
      text += `[${inner.trim()}](${absolute(href, origin)})`
    else if (tag === "code") text += `\`${inner}\``
    else if (tag === "br") text += " "
    else text += inner
  }
  return text
}

/** A GitHub table of `headers` and `rows`, already written as Markdown. */
export function toMarkdownTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string {
  const line = (cells: readonly string[]) =>
    `| ${cells.map((cell) => cell.trim()).join(" | ")} |`
  return [
    line(headers.map(escapeCell)),
    line(headers.map(() => "---")),
    ...rows.map(line),
  ].join("\n")
}

/**
 * `<page>-<heading>` (`machines-stacks`): the page's title and the heading
 * the table is under, or `tabla` when there is nothing to go by.
 */
export function exportName(title: string, heading: string | null): string {
  const parts = [slugOf(title), slugOf(heading ?? "")].filter(
    (part) => part !== ""
  )
  if (parts.length === 0) return "tabla"
  return parts.join("-")
}

/** Offers `text` as a file to save. */
export function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
