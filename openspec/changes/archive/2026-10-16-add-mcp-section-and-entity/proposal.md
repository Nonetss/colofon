## Why

The first test of the documentation MCP showed two gaps (`TODO.md` 6). `search` returns routes to a section (`…#resolucion-inversa`), but `read` drops the fragment and returns the whole page, so an agent pays for a long page to get one paragraph. Agents also come across catalog entities (a `ref` value, a `catalog:` link, a row of an `<Entities>` table) and have no direct way to look one up by its type and id, unless they already know the platform's `catalog/<type>/<id>` page path.

## What Changes

- `read` with a `#section` fragment returns only that section: its heading and everything under it until the next heading of the same or a higher level, so a level 2 section keeps its level 3 subsections. The location line adds the section's title and keeps the fragment in the address. A fragment that names no section of the page is a tool error that lists the page's sections. Without a fragment, `read` does not change.
- New `entity` tool: takes `repository`, `type` and `id`, and returns the entity's generated catalog page (`catalog/<type>/<id>`) as Markdown under the same location line as `read`. That page already shows the entity's fields with the entities they point at, its source, its own page, the pages that cite it, the entities of other types that point at it, and the diagrams it is in. An unknown repository, type or entity is a tool error that says where to find the valid ones.
- Both read through `v1.docs.page` as the API key's user, like every other tool, so they will inherit the per-repository permissions (`TODO.md` 2) without changes.
- The server's instructions and the `read` description mention sections and the new tool.
- Out of scope: the `skills` tools (they depend on serving the skills, `TODO.md` 5), writing to the repositories through the MCP, and any change to `llm.txt`, `llms.txt` or "Copiar en Markdown".

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `documentation-mcp`: the tool list gains `entity`, the server's instructions mention it, the `read` tool returns one section when the route has a `#section` fragment, and there is a new requirement for the `entity` tool.

## Impact

- **packages/api**: `src/v1/mcp/tools.ts` (`parseRoute` keeps the fragment, `readTool` slices the section, a new `entityTool`), `src/v1/mcp/server.ts` (registers `entity`, new instructions and descriptions), and a small section-slicing helper on the hast tree. Tests in `tests/v1/mcp/tools.test.ts` and `handler.test.ts`.
- **Stack skill**: `references/api/mcp.md` lists the new tool if it lists the tools.
- No new procedures, dependencies, frontend, gateway, database or migration changes.
