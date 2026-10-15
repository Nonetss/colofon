// How the Markdown routes answer: plain text, so a browser shows it inline,
// and never kept by a shared cache, since it depends on the credential.

const HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "private, no-cache",
}

/** A Markdown route's answer holding `body`. */
export function textResponse(body: string): Response {
  return new Response(body, { headers: HEADERS })
}

/** A Markdown route's answer for an unknown repository or page. */
export function textNotFound(): Response {
  return new Response("No existe esa página.\n", {
    status: 404,
    headers: HEADERS,
  })
}
