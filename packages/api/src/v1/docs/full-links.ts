// "Copiar en Markdown" and `llm.txt` hand the page to someone who isn't on
// the site, so its links to reader routes (`/repo/page`) become full
// addresses. Kept apart from `markdown.ts` so the browser script that copies
// doesn't load the Markdown writer.

/** `markdown` with every link and image to `/…` prefixed with `origin`. */
export function withOrigin(markdown: string, origin: string): string {
  return markdown.replaceAll("](/", `](${origin}/`)
}
