# Agent Skills (`/.well-known/agent-skills/`)

The site serves Agent Skills an agent can discover and install from its address, over the Agent Skills discovery draft v0.2.0 (Cloudflare RFC). The behavior contract is the `agent-skills` OpenSpec capability, with the `skills/` folder rules in `content-contract` and the agent guide in `documentation-llm-text`.

## Where it lives

| File | Holds |
| --- | --- |
| `packages/api/skills/<name>/SKILL.md` | The platform's skills, the same on every site and for every caller: `colofon` (how an agent works with a site) and `doc-writing` (how to write a content repository; the reasoning behind each of its rules is in `references/api/doc-writing-skill.md`). |
| `packages/content/src/contract/skills.ts` | `readSkills(root)` (a repository's `skills/`, validated: folder name, front matter `name` and `description`), `isSkillName`, `withSkillName` (sets the front matter's `name`, every other byte kept). `readSite` calls it, so a repository's skills are cached with its checkout and their problems go on the home. |
| `packages/api/src/v1/skills/` | The `v1.skills` feature: public `list` and `get`. Without a user, only the platform's skills. With one, also each content repository's, as `<slug>-<name>` with its `name` rewritten, in the repository order the docs `nav` uses. Each entry has the path the web serves it at and the `sha256:` digest of the served text. |
| `apps/frontend/src/pages/.well-known/agent-skills/` | `index.json.ts` (the draft's JSON) and `[name]/SKILL.md.ts` (`text/markdown`), through `features/docs/llm-text/model/skills-response.ts`: `Access-Control-Allow-Origin: *`, `private, no-cache`. |
| `packages/api/src/v1/docs/llm-text.ts` | `agentGuide`, `llmsGuide` (the anonymous `/llms.txt`), and the skills in `llmsIndex`/`repositoryLlmsIndex`. |

## Rules

- **One source for who sees what.** The routes, `/llms.txt` and the MCP's `skills`/`skill` all read `v1.skills`, which takes the content repositories from the same store and reader as `v1.docs`. When per-repository permissions land in the docs procedures, apply them in `contentSkills` in `src/v1/skills/handler.ts` too.
- **The agent's way in needs no key.** The middleware lets `/llms.txt` and the two discovery routes through without a session (`isOptionalCredentialPath` in `apps/frontend/src/lib/markdown-text-path.ts`). Without a key they show only what holds nothing private: the guide and the platform's skills. Every other Markdown route still answers 401.
- **Platform skills are code.** They are read once per process from `../../packages/api/skills`, resolved from the backend's working directory like the migrations, and the backend image copies the folder (`apps/backend/Dockerfile`). `tests/v1/skills/platform.test.ts` fails when one of them breaks the rules, so a broken one never ships. Keep them thin: they say how to work and where to look, never what a site holds.
- **The digest covers the served bytes.** It is computed from the text after the `name` rewrite, so a client verifies what it downloads.
