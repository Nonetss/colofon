// The routes that serve the documentation as Markdown for an AI: the
// `llms.txt` indexes (global and per repository) and every page's `llm.txt`.
// The middleware answers them 401 instead of sending to the login page.

const INDEX_FILE = "/llms.txt"
const PAGE_FILE = "/llm.txt"

/** Whether `path` is `/llms.txt`, `/<repo>/llms.txt` or `<page>/llm.txt`. */
export function isMarkdownTextPath(path: string): boolean {
  if (path === INDEX_FILE) return true
  const segments = path.split("/")
  if (path.endsWith(INDEX_FILE)) return segments.length === 3
  if (path.endsWith(PAGE_FILE)) return segments.length >= 3
  return false
}
