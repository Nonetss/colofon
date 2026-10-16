## Context

- The MCP tools live in `packages/api/src/v1/mcp/tools.ts`, one function per tool, and only call the `nav`, `page` and `search` procedures of `v1.docs` as the caller (`DocsClient`). `server.ts` registers them. `readTool` parses the route with `parseRoute`, which today strips `?` and `#`, calls `docs.page`, writes the tree with `pageMarkdown` + `withOrigin` and prepends `locationLine`.
- `v1.docs.page` returns the sanitized hast `tree` and `headings` (`{ depth: 2 | 3, id, text }`). The ids are the ones the reader gives the headings and the ones `search` puts in its `#section` routes.
- `packages/content` already makes a page for every valid entity at `catalog/<type>/<id>` (`entityPath` in `contract/catalog-paths.ts`; `catalogPages` and `entityBody` in `pages/catalog-pages.ts`). Its body has the fields table (references linked), `Fuente`, `Página`, "Páginas que la citan", "Referencias" (entities of other types that point at it, by type) and "Diagramas". `catalog` and `catalog/<type>` are generated pages too. `v1.docs.page` serves them like any page, so `read` can already read them if the agent knows the path.
- `pageMarkdown` writes title + description + body. The reader's `llm.txt` uses it, and its output must not change.

## Goals / Non-Goals

**Goals:**

- A `#section` route returns only that section, so the agent spends tokens on the part `search` pointed at.
- `entity` looks an entity up by its type and id with no knowledge of the platform's paths, and shows exactly what the reader's entity page shows.
- No new procedure: both tools keep reading through `docs.page`, so access rules stay in one place.

**Non-Goals:**

- Sections in `llm.txt` or "Copiar en Markdown" (a URL fragment never reaches the server).
- Level 4+ headings as sections. `headings` only lists levels 2 and 3, and those are the only ones `search` routes to.
- A structured (JSON) output for `entity`. The text is what an agent reads, like `read`.
- Searching every repository for an entity when `repository` is missing.

## Decisions

### 1. `parseRoute` keeps the fragment

`ParsedRoute` gains `section: string | null`: the decoded fragment, or null when there is none or it is empty. `repository` and `path` don't change, so the call to `docs.page` stays `{ repository, path }`. The query is still dropped. The existing tests that pass `#x` keep their `repository`/`path` and gain `section`.

### 2. Slicing the section on the hast tree, before writing Markdown

A new helper `sectionTree(tree: Root, id: string): Root | null` in `packages/api/src/v1/mcp/section.ts` (only the MCP uses it). It looks for the heading among the root's direct children: an `h2`/`h3` element whose `id` property is `id`. It returns a root that starts with that heading and holds every following sibling up to the next `h2` (for an `h2`) or `h2`/`h3` (for an `h3`), not included. If the heading isn't a direct child, it returns null.

`readTool` then:

1. With no `section`, does what it does today.
2. With a `section` that isn't among `page.headings`, returns the error from the spec. It lists `- \`#id\`: text` for each heading, then `Read /<repo>/<path> for the whole page.`
3. With a known `section`, writes `sectionTree(...)` with a new `bodyMarkdown(tree)` exported from `src/v1/docs/markdown.ts`. It is today's private `body` (`pageMarkdown` always writes `# <title>` first, so it can't be reused with an empty title), and `pageMarkdown` keeps calling it, so `llm.txt` doesn't change. Then `withOrigin`, under the location line with the heading's text appended to the trail and `#id` appended to the address.
4. If `sectionTree` returns null for a heading that *is* in `page.headings` (it sits inside a component's wrapper), it returns the whole page, as today. That is not an error: the agent still gets the text it asked for. The fallback is invisible to the agent, so it is covered by a test.

Slicing hast rather than the Markdown text keeps the Markdown rules (alerts, diagrams, links) the same as `llm.txt` without parsing Markdown back. It also matches the section by id, not by heading text.

*Alternative:* slicing the Markdown output by `##` lines. It is fragile with headings inside code blocks or quotes, and it would match on text, not on id.

### 3. `entity` reads the generated page through `docs.page`

`entityTool({ docs, origin, input: { repository, type, id } })` calls `docs.page({ repository, path: entityPath(type, id) })` and formats the page exactly like `readTool` without a section. The shared part (page → location line + Markdown) becomes one private function used by both, so "identical to `read`" holds by construction. `entityPath` comes from `@nonete/content` (the docs handler already imports it from there). The barrel also exports `catalogTypePath` and `CATALOG_PATH` for the error texts, next to `entityPath` in `packages/content/src/index.ts`.

On a `NOT_FOUND`/`BAD_REQUEST` (`isMissing`):

1. Use `docs.nav()` to tell an unknown or unavailable repository apart, reusing `missingRepository` (as `search` does). Its message is the one `index` and `search` already give.
2. Otherwise call `docs.page({ repository, path: catalogTypePath(type) })`. If it exists, the type is known and the id is not: the error gives `/<repo>/catalog/<type>`. If it is missing too, the error gives `/<repo>/catalog`.

These extra calls only happen on the error path. The input schema is three required non-empty strings described for the agent. A `type`/`id` with `/` or `..` fails `docs.page`'s path check (`BAD_REQUEST`) and ends in the same "unknown" errors, which is what the agent needs.

*Alternatives:*
- A new `v1.docs.entity` procedure returning the entity as data. It would duplicate what `entityBody` already arranges (citations, reverse references, diagrams) and add a second shape to keep in sync with the reader.
- Only documenting the `catalog/<type>/<id>` path in the instructions. It works, but the TODO asks for the lookup by type and id, and a named tool is easier for an agent to find.

### 4. Server texts

- The instructions add: `read` returns one section when the route carries `#section`; `entity` looks up a catalog entity by repository, type and id, with its fields, the pages that cite it and the entities that point at it.
- The `read` description adds the section behaviour. `entity` gets `title: "Entity"`, a description with what it returns, and the same read-only annotations.

## Risks / Trade-offs

- **Headings nested in components** → the whole-page fallback in Decision 2.4 keeps `read` useful. It is rare in content, because MDX headings are top-level.
- **The catalog path is an implementation detail of `packages/content`** → the tool uses `entityPath`/`catalogTypePath`, so a change to the path follows automatically. The error texts quote the routes built from them, never hardcoded strings.
- **Extra round trips on errors** → at most two more `docs` calls, only on the error path. They save the agent a failed guess.
