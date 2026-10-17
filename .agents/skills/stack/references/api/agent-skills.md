# Agent Skills (`/.well-known/agent-skills/`)

The site serves Agent Skills an agent can discover and install from its address, over the Agent Skills discovery draft v0.2.0 (Cloudflare RFC). The behavior contract is the `agent-skills` OpenSpec capability, with the `skills/` folder rules in `content-contract` and the agent guide in `documentation-llm-text`.

## Where it lives

| File | Holds |
| --- | --- |
| `packages/api/skills/colofon/` | `colofon`, how an agent works with a site (its indexes, the MCP and every tool, installing and refreshing skills) and where writing starts. |
| `doc-example/.agents/skills/colofon-*/` | The writing skills common to every content repository (one per folder of a repository, one per repeated task), with their `references/`. Their only copy: content repositories never hold them, and an agent working on `doc-example` finds them through `.claude/skills/`. |
| `packages/content/src/contract/skills.ts` | `readSkills(root)` (a repository's `skills/`, validated: folder name, front matter `name` and `description`; other files ignored), `readSkillsWithFiles(root)` (the same plus every other UTF-8 file of each folder, for the platform's skills), `isSkillName`, `withSkillName` (sets the front matter's `name`, every other byte kept). `readSite` calls `readSkills`, so a repository's skills are cached with its checkout and their problems go on the home. |
| `packages/api/src/v1/skills/` | The `v1.skills` feature: public `list`, `get`, `file` and `archive`. Without a user, only the platform's skills (both roots, `platformRoots`, by name). With one, also each content repository's, as `<slug>-<name>` with its `name` rewritten, in the repository order the docs `nav` uses. Each entry has its `type` (`archive` for a platform skill with files, else `skill-md`), its paths, its `files` and the `sha256:` digest of what installs it. `archive.ts` is the deterministic tar.gz writer. |
| `apps/frontend/src/pages/.well-known/agent-skills/` | `index.json.ts` (the draft's JSON), `[archive].tar.gz.ts` (`application/gzip`) and `[name]/[...path].ts` (`SKILL.md` or any file of the skill), through `features/docs/llm-text/model/skills-response.ts`: `Access-Control-Allow-Origin: *`, `private, no-cache`. |
| `packages/api/src/v1/docs/llm-text.ts` | `agentGuide` (with the «Configurar tu agente» setup procedure), `llmsGuide` (the anonymous `/llms.txt`), and the skills in `llmsIndex`/`repositoryLlmsIndex`. |
| `apps/frontend/src/features/api-keys/manage/model/skills-prompt.ts` | The setup prompt: the profile's «Skills para tu IA» page, `/me/skills` (key placeholder) and the created-key dialog's first tab (the key). It only points at the procedure in `/llms.txt`, so the steps live in one place. |

## Rules

- **One source for who sees what.** The routes, `/llms.txt` and the MCP's `skills`/`skill` all read `v1.skills`, which takes the content repositories from the same store and reader as `v1.docs`. When per-repository permissions land in the docs procedures, apply them in `contentSkills` in `src/v1/skills/handler.ts` too.
- **The agent's way in needs no key.** The middleware lets `/llms.txt` and the two discovery routes through without a session (`isOptionalCredentialPath` in `apps/frontend/src/lib/markdown-text-path.ts`). Without a key they show only what holds nothing private: the guide and the platform's skills. Every other Markdown route still answers 401.
- **Platform skills are code.** They are read once per process from `../../packages/api/skills` and `../../doc-example/.agents/skills`, resolved from the backend's working directory like the migrations, and the backend image copies both folders (`apps/backend/Dockerfile`). `tests/v1/skills/platform.test.ts` fails when one of them breaks the rules (or links a reference it doesn't hold), so a broken one never ships. Every platform skill is `colofon` or `colofon-*`. They say how to work and where to look, never what a site holds.
- **Archives are deterministic.** `buildTarGz` fixes order, modes, owners and times, so a digest only changes when a file does; never swap it for a library without keeping that property and its tests.
- **The digest covers the served bytes.** For `skill-md`, the text after the `name` rewrite; for `archive`, the archive's bytes. A client verifies what it downloads.
