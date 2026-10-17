## 1. Writing skills in doc-example

- [x] 1.1 Rename `doc-example/.agents/skills/{documentation,docs,catalog,diagrams,styles,skills}` to `colofon-*`, set each front matter `name` to its folder, and update every cross-reference to another skill inside them; verify `grep -rnE "the \`(documentation|docs|catalog|diagrams|styles|skills)\` skill" doc-example/.agents` finds nothing
- [x] 1.2 Turn each `.agents/commands/doc/*.md` into a skill (`colofon-questions`, `colofon-pending`, `colofon-check`, `colofon-review`, `colofon-new-page`, `colofon-new-diagram`) with a `description` saying when to run it and `$ARGUMENTS` replaced by what the user names, update every mention of `/doc:<name>` in the skills to the new names, and remove `.agents/commands/`; verify no `/doc:` remains under `doc-example/.agents`
- [x] 1.3 Replace `doc-example/.claude/skills/*` symlinks with one per `colofon-*` skill and remove `.claude/commands/`; verify every link resolves (`find doc-example/.claude -xtype l` prints nothing)
- [x] 1.4 Update the `colofon-documentation` skill and its `layout.md`: the writing skills are the platform's, installed from it and never copied into or edited in a site's repository, and a content repository holds only `AGENTS.md` (rules plus «Este sitio»); verify by reading both against `design.md` decision 10

## 2. Reading skills with their files

- [x] 2.1 Make `readSkills` in `packages/content/src/contract/skills.ts` return each skill's other files (relative POSIX paths, sorted, text only, dot-files and symlinks skipped, non-UTF-8 reported as a problem) and add tests in `packages/content/tests/contract/skills.test.ts` for files, nesting, skipped entries and a binary file
- [x] 2.2 Add the deterministic tar.gz writer (sorted ustar entries, mode 0644, uid/gid 0, mtime 0, gzip mtime 0) with tests: identical bytes on two builds, extraction with `tar -xzf` reproducing the files with `SKILL.md` at the root, and no `..` or absolute path

## 3. Skills API

- [x] 3.1 Let `createSkillsHandler` take `platformRoots`, read both roots, fail on a duplicate name, and build each multi-file skill's archive and digest once; set the roots in `v1/skills/router.ts` to `packages/api` and `doc-example/.agents`; verify the handler tests list `colofon` and every `colofon-*` skill in name order
- [x] 3.2 Extend `skillsOutput.list` with `type`, `archivePath` and `files`, add `v1.skills.file({ name, path })` and `v1.skills.archive({ name })` (binary `File`, NOT_FOUND for single-file and unknown skills, paths matched only against the skill's file list), and cover them in `packages/api/tests/v1/skills/`, `..` and unknown paths included
- [x] 3.3 Remove `packages/api/skills/doc-writing/` and update `packages/api/tests/v1/skills/platform.test.ts` to read both roots and expect `colofon` plus the twelve `colofon-*` skills; verify `bun run test` passes in `packages/api`
- [x] 3.4 Rewrite `packages/api/skills/colofon/SKILL.md`:
  - every MCP tool (`secrets`, `request` and `sync` included);
  - archive and single-file installs;
  - refreshing installed skills and dropping ones the index no longer lists;
  - that writing a content repository starts with `colofon-documentation`.
  
  Verify the platform test still passes

## 4. MCP

- [x] 4.1 Make the `skills` tool list each skill's files (text and structured content) and give `skill` an optional `path` read through `v1.skills.file`, with a tool error listing the files for an unknown path; update `packages/api/tests/v1/mcp/` for both and verify they pass

## 5. llms.txt and the setup prompt

- [x] 5.1 Add the "Configurar tu agente" setup procedure to `agentGuide` in `packages/api/src/v1/docs/llm-text.ts` (index, install `skill-md` and `archive` with digest checks, report, optional MCP, `curl`/`tar` examples with the key placeholder) and list platform skills by their `url`; update its tests for the anonymous guide scenario and verify they pass
- [x] 5.2 Rewrite `skillsPrompt(origin, key?)` in `apps/frontend/src/features/api-keys/manage/model/skills-prompt.ts` as the short prompt pointing at `/llms.txt`'s procedure, and update `tests/unit/features/api-keys/skills-prompt.test.ts` for the placeholder and filled-key cases
- [x] 5.3 Add a first "Skills" tab to `api-key-created-dialog.tsx` with `skillsPrompt(origin, key)` and adjust the profile's "Skills para tu IA" copy to the new flow; verify with `check-types` and the frontend unit tests

## 6. Web routes

- [x] 6.1 Serve the index from the new list shape (`type`, archive `url`, archive digest) in `skills-response.ts`, add `.well-known/agent-skills/[name].tar.gz.ts` (`application/gzip`) and replace `[name]/SKILL.md.ts` with `[name]/[...path].ts`, all with the existing CORS and no-store headers and Spanish 404s; extend `tests/unit/features/docs/llm-text/skills-response.test.ts`
- [x] 6.2 Widen `isOptionalCredentialPath` in `apps/frontend/src/lib/markdown-text-path.ts` to `<name>.tar.gz` and `<name>/<path>` with the same name check, and cover both (and a rejected `..`) in `tests/unit/lib/markdown-text-path.test.ts`

## 7. Docker

- [x] 7.1 Re-include `doc-example/.agents/skills` in `.dockerignore` and copy it to `/app/doc-example/.agents/skills` in `apps/backend/Dockerfile`, and add the folder to the backend's paths in `.github/workflows/docker-build.yml` so a skill change rebuilds the image; verify by building the backend image and listing that folder inside it

## 8. doc-example content and conventions

- [x] 8.1 Rewrite `doc-example/AGENTS.md` for the new model:
  - routing to the `colofon-*` skills;
  - how to get them (setup prompt or `/llms.txt`);
  - the "skills are the platform's" rule;
  - «Este sitio» with the platform's address.
  
  Verify every path it cites exists
- [x] 8.2 Update `doc-example/README.md` and the guide pages `docs/publishing/writing-agents.mdx` and `docs/publishing/agents.mdx` (no `.agents/` copy, no `doc-writing`, the setup prompt, archive skills), bumping `actualizado`; verify with the `colofon-check` skill's checklist that links and headers still hold
- [x] 8.3 Update `doc-example/skills/guide/SKILL.md` and the `colofon-skills` skill's mentions of `doc-writing` to the new platform skills; verify `grep -rn doc-writing doc-example packages apps` finds only nothing or test fixtures
- [x] 8.4 Update the `stack` skill reference that describes `doc-example` and the backend image (`.agents/skills/stack/references/workspaces.md` and the Docker reference) to say the backend serves `doc-example/.agents/skills` and the image ships it

## 9. Validation

- [x] 9.1 Run `bun run check-types`, Biome and `bun run test` from the root and verify all pass
- [x] 9.2 Run `openspec validate self-configuring-agent-skills --strict` and verify it passes
