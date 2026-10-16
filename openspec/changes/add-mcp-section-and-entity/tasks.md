## 1. Shared pieces

- [x] 1.1 In `packages/api/src/v1/docs/markdown.ts`, export the body writer as `bodyMarkdown(tree: Root | null): string` and have `pageMarkdown` call it, unchanged. Verify that `tests/v1/docs/markdown.test.ts` still passes untouched, and add a test that `bodyMarkdown` writes no `#` title line.
- [x] 1.2 Export `catalogTypePath` and `CATALOG_PATH` from `packages/content/src/index.ts` next to `entityPath`. Verify `check-types` in `packages/content` and `packages/api`.
- [x] 1.3 Create `packages/api/src/v1/mcp/section.ts` with `sectionTree(tree, id)` per design Decision 2: the top-level `h2`/`h3` with that `id` and its following siblings up to the next heading of the same or a higher level, or null. Add `packages/api/tests/v1/mcp/section.test.ts`: an `h2` keeps its `h3`s and stops at the next `h2`, an `h3` stops at the next `h3` or `h2`, the last section runs to the end, and an unknown id or a nested heading gives null.

## 2. Tools

- [x] 2.1 In `tools.ts`, add `section: string | null` to `ParsedRoute` and fill it in `parseRoute` (decoded fragment; null for none or empty). Update the `parseRoute` tests and add cases for `#ptr`, `#`, an encoded fragment and a full address with `/llm.txt#x`.
- [x] 2.2 Pull the page → `Location:` line + Markdown formatting out of `readTool` into one private function, then make `readTool` follow design Decision 2 (whole page, unknown-section error with the heading list and the whole-page route, section text with the heading in the trail and `#id` in the address, and the whole-page fallback when `sectionTree` gives null). Add tests to `tools.test.ts` with a fake page that has `h2`/`h3` headings: the section text and its location line, the level 3 case, the unknown-section error, `#` treated as the whole page, and the nested-heading fallback. The existing whole-page `read` test must still pass unchanged.
- [x] 2.3 Add `entityTool` to `tools.ts` per design Decision 3: `docs.page` at `entityPath(type, id)`, the same formatting as `read`, and the error path (unknown repository through `missingRepository`; unknown id when `catalogTypePath(type)` exists, giving `/<repo>/catalog/<type>`; otherwise `/<repo>/catalog`). Add tests to `tools.test.ts`: text identical to `readTool` for the same catalog route, the page path requested, and each of the three errors. A non-missing error must be rethrown.
- [x] 2.4 In `server.ts`, register `entity` (`title: "Entity"`, three required non-empty strings described for the agent, read-only annotations), and update `INSTRUCTIONS` and the `read` description per design Decision 4. In `handler.test.ts`, update the tool list to the five tools and assert that `entity` is read-only. Verify `bun test` in `packages/api`.

## 3. Docs and validation

- [x] 3.1 Update `.agents/skills/stack/references/api/mcp.md`: the tools in the `tools.ts` row (`entityTool`), and the "Same text as the routes" rule (a `#section` route returns only that section, through `bodyMarkdown` and `sectionTree`).
- [x] 3.2 Run `bun run check-types`, `bunx biome check` on the changed files and `bun run test`. All green.
- [ ] 3.3 At archive, update the `documentation-mcp` spec's Purpose to mention the `entity` tool and reading one section.
