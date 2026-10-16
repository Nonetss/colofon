## 1. Content: reading `skills/`

- [x] 1.1 Create `packages/content/src/contract/skills.ts` with `isSkillName`, `ContentSkill` and `readSkills(root)` per design Decision 1 and the `content-contract` "Skills folder" requirement. Export them from the barrel. Add `packages/content/tests/contract/skills.test.ts` (temporary folders, as the other reader tests do): a valid skill, a missing `skills/`, a name that doesn't match its folder, missing or invalid front matter, an empty or too long description, a bad folder name, a file directly under `skills/`, extra files in a skill folder ignored, and the others still read when one fails.
- [x] 1.2 Call `readSkills` from `readSite`: `skills` on `Site`, problems among the site's problems. Add a test in the site tests that a broken skill shows as a site problem and the pages still read. Verify `check-types` and `bun test` in `packages/content`.

## 2. Platform skills

- [x] 2.1 Write `packages/api/skills/colofon/SKILL.md` (English, thin: how an agent works with the platform through `/llms.txt`, `llm.txt`, the MCP and its tools, the skills index and the API key; no site content, no secrets).
- [x] 2.2 Move `doc-example/skills/doc-writing/SKILL.md` to `packages/api/skills/doc-writing/SKILL.md` and update it to the current contract names (English folders and files, Spanish YAML keys), checking each name against `packages/content/src/contract/`. Add a test in `packages/api` that reads `packages/api/skills` with `readSkills` and finds no problems, so a broken platform skill fails CI.
- [x] 2.3 Copy `packages/api/skills` into the backend image in `apps/backend/Dockerfile`, next to the migrations (`/app/packages/api/skills`). Verify by reading the Dockerfile that the path matches what the handler resolves from `apps/backend`.

## 3. `v1.skills` (packages/api)

- [x] 3.1 Read `references/api/layering.md` and `http-semantics.md`. Create `packages/api/src/v1/skills/{input,output,handler,router}.ts` per design Decision 3: public `list` (`GET /v1/skills`) and `get` (`GET /v1/skills/{name}`), the platform skills folder as a factory option, the content skills through the docs `nav` and `reader.site`, `<slug>-<name>` naming with the front matter `name` rewrite, the 64-character and platform-name exclusions, and the `sha256:` digest. Mount it in the v1 router. Verify `check-types`.
- [x] 3.2 Write `packages/api/tests/v1/skills/handler.test.ts` per `references/writing-unit-tests.md`:
  - Platform only without a user, and with a user the content skills in navigation order.
  - The rewritten `name` with every other byte kept, and the digest of the served text.
  - Too-long and platform-clashing names left out.
  - `get` returns the same text as `list`'s digest covers.
  - `NOT_FOUND` for an unknown name and for a content skill without a user.

  Verify `bun test`.

## 4. llms.txt and the MCP

- [x] 4.1 In `packages/api/src/v1/docs/llm-text.ts`, add `agentGuide`, `llmsGuide` and the skills parameter of `llmsIndex`/`repositoryLlmsIndex` per design Decision 5. Update `tests/v1/docs/llm-text.test.ts`:
  - The guide's addresses: `/me`, `/mcp`, the index and each platform skill link.
  - The MCP command shape, matching `agent-setups.ts`.
  - The anonymous index has no repository.
  - `### Skills` sits under a repository that has skills and not under one without.
  - The repository index lists its skills and names `/llms.txt`.
- [x] 4.2 Add `skills` to `ToolScope`, `skillsTool` and `skillTool` to `tools.ts`, and register `skills` and `skill` in `server.ts` with read-only annotations and the new instruction line. Make `indexTool` pass the skills, so it still equals `/llms.txt`. Pass `client.v1.skills` from `apps/backend/src/routers/mcp.ts`. Add tests in `tools.test.ts` (text, structured content, unknown skill error, `index` with skills) and update the tool list in `handler.test.ts` to the seven tools. Verify `bun test` in `packages/api`.

## 5. Frontend

- [x] 5.1 Add the optional-credential path helper next to `isMarkdownTextPath` (`/llms.txt`, `/.well-known/agent-skills/index.json`, `/.well-known/agent-skills/<name>/SKILL.md`) with its tests in `apps/frontend/tests/unit/`. Change the middleware so those paths go on without a session (`locals.user` null) instead of 401. Add the `/llms.txt` address to the 401 text.
- [x] 5.2 Create `apps/frontend/src/pages/.well-known/agent-skills/index.json.ts` and `[name]/SKILL.md.ts` per design Decision 4 (the draft's JSON, `text/markdown`, 404 `text/plain` in Spanish, `Access-Control-Allow-Origin: *`, `private, no-cache`). Check that Astro routes the dot folder by building (`bun run build` in `apps/frontend`) and finding both routes in the output. If it doesn't, use the middleware rewrite from the design's risks.
- [x] 5.3 Change `apps/frontend/src/pages/llms.txt.ts` to write `llmsIndex` with a user and `llmsGuide` without one, and `[repo]/llms.txt.ts` to pass its skills. Verify `check-types` in `apps/frontend`.

## 6. doc-example and docs

- [x] 6.1 In `doc-example`: rewrite the "Skills servidas" part of `docs/publishing/agents.mdx` per design Decision 7, remove `skills/doc-writing/`, add `skills/guide/SKILL.md`, and update `.agents/skills/skills/` with the naming and validation rules. Update `doc-example/docs/repository/index.mdx` if its tree example no longer fits.
- [x] 6.2 Update the stack skill: `references/api/mcp.md` (the `skills`/`skill` tools, `ToolScope.skills`, and the guide's MCP command as a second place to keep in step), a new `references/api/agent-skills.md` (where platform skills live, how content skills are read and published, the access rule, the image copy) with its row in `SKILL.md`, and `references/docker.md` for the copied folder.
- [x] 6.3 Run `bun run check-types`, Biome on the changed files, `bun run tailwind:check` if any class changed, and `bun run test`. All green.
- [ ] 6.4 At archive, update the Purpose of `documentation-llm-text` (the index is now also the agent's public entry point) and of `documentation-mcp` (skills).
