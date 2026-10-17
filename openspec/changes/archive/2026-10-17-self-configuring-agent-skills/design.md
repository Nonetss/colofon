## Context

- `v1.skills` (`packages/api/src/v1/skills/`) reads the platform skills once per process with `readSkills(platformRoot)` from `@nonete/content`. The function reads `<root>/skills/<name>/SKILL.md` only, checks the front matter (`name` equal to the folder, a `description`) and ignores every other file. The backend resolves `platformRoot` as `../../packages/api` from its working directory. The image copies `packages/api/skills/` for that reason.
- The web serves the discovery index and `<name>/SKILL.md` from Astro routes that call `v1.skills.list` and `v1.skills.get`. The middleware lets those two paths and `/llms.txt` through without a credential (`isOptionalCredentialPath`).
- The writing skills live in `doc-example/.agents/skills/` (`documentation`, `docs`, `catalog`, `diagrams`, `styles`, `skills`, ~85 files). `/doc:` commands live in `.agents/commands/doc/`. `.dockerignore` excludes `doc-example/` from every image.
- The profile's "Skills para tu IA" (`profile-agent-skills.tsx`) shows `skillsPrompt(origin)` with a key placeholder. The created-key dialog (`api-key-created-dialog.tsx`) has the MCP tabs only.

## Goals / Non-Goals

**Goals:**
- One source for the writing skills (`doc-example/.agents/skills/`), served without copies.
- Skills with `references/` installable in one step by any agent that can download and extract a `.tar.gz`, and readable file by file by one that can't (MCP, `<name>/<path>`).
- Archive digests stable across restarts, so the "refresh when the digest changes" rule doesn't fire for nothing.

**Non-Goals:**
- Multi-file content skills: a content repository's `skills/` stays one `SKILL.md` per skill (`content-contract` unchanged).
- Migrating existing site repositories (homelab) off their `.agents/` copies.
- Any change to who can read what (`/git/*`, sign-up), handled separately.

## Decisions

**1. The writing skills keep their source in `doc-example/.agents/skills/`, renamed with `colofon-`.**
Folders and front matter `name`s become `colofon-documentation`, `colofon-docs`, … and every cross-reference inside them ("load the `docs` skill") is updated to the new names. The platform then serves them as they are: the published name is the folder name, no rewriting.
- *Rejected: rewriting `name` only at publish time.* The texts would name skills (`docs`) that don't exist once installed.
- *Rejected: moving them to `packages/api/skills/`.* `doc-example/.agents/` is where the user keeps and edits them, and where an agent working on `doc-example` finds them through `.claude/skills/`.

**2. The `/doc:` commands become skills in the same folder.**
`colofon-questions`, `colofon-pending`, `colofon-check`, `colofon-review`, `colofon-new-page` and `colofon-new-diagram`. Each `SKILL.md` keeps the command's steps, and its `description` says when to run it. `$ARGUMENTS` becomes "the section/path the user names". `.agents/commands/` and `.claude/commands/` are removed. `colofon-new-diagram` avoids two skills differing only by an `s` (`colofon-diagrams`).

**3. Two skill roots, read with one function.**
`readSkills` gains the files of each skill: every regular file under the folder, as relative POSIX paths, with dot-files and symlinks skipped. Text files only; a non-UTF-8 file is a problem. The skills handler takes `platformRoots: string[]`, which the backend sets to `packages/api` and `doc-example/.agents`, resolved from its working directory as today. Platform names must be unique across roots: a duplicate fails the platform test. Content repositories keep calling it, and their extra files stay ignored for serving (non-goal).

**4. Archives: an in-house deterministic tar.gz writer.**
A small ustar writer, with:
- entries sorted by path, directories implied;
- mode `0644`, uid/gid `0`, empty user/group names, mtime `0`;
- the result gzipped with the gzip header's mtime `0`.

It is built once per process with the skills, and the digest is computed over those bytes.
- *Rejected: a `tar` dependency or `Bun.Archive`.* Byte-for-byte stability across versions isn't guaranteed. The writer is about 60 lines and fully unit-testable (round-trip through `tar -xzf` in a test, same bytes twice).
- *Rejected: `.zip`.* The draft prefers `.tar.gz`, and `tar` is everywhere the agents run.

**5. API shape.**
- `v1.skills.list` entries gain `type` (`skill-md` | `archive`), `archivePath` (null for `skill-md`) and `files` (relative paths besides `SKILL.md`). The index's `url` and `digest` follow the type.
- New `v1.skills.file({ name, path })` returns one file's text.
- New `v1.skills.archive({ name })` returns the archive as a binary `File` (oRPC carries `Blob`/`File`), NOT_FOUND for a single-file skill.
- Paths are matched against the skill's file list, never joined onto the filesystem, so `..` can't escape.

**6. Web routes.**
- `.well-known/agent-skills/[name].tar.gz.ts` for the archive.
- `.well-known/agent-skills/[name]/[...path].ts` replaces `[name]/SKILL.md.ts` and serves `SKILL.md` and any other file.
- `isOptionalCredentialPath` widens to `<name>.tar.gz` and `<name>/<path>`, keeping the `[a-z0-9-]` name check.

Same CORS and no-store headers as today.

**7. MCP.**
`skills` adds each skill's files (text and structured content). `skill` takes an optional `path` and calls `v1.skills.file`. Archives aren't offered over MCP: an agent on MCP reads file by file.

**8. Setup procedure in `/llms.txt`, short prompt on `/me`.**
`agentGuide` gets a "Configurar tu agente" section with the numbered procedure and `curl`/`tar` examples (key as placeholder), and lists the platform skills by their `url`. `skillsPrompt(origin, key?)` becomes three or four lines:
- configure yourself for `<origin>`;
- send `x-api-key: <key>`;
- follow the procedure in `<origin>/llms.txt`;
- don't write the key into any file.

`/me` shows it with the placeholder. The created-key dialog gets a first tab, "Skills", with `skillsPrompt(origin, key)`. Keeping the procedure in `/llms.txt` means the prompt never goes stale when the procedure changes.

**9. Docker.**
- `.dockerignore` re-includes the skills (`doc-example/*` excluded, then `!doc-example/.agents`).
- The backend `Dockerfile` copies `doc-example/.agents/skills` to `/app/doc-example/.agents/skills`, next to `packages/api/skills`.

The dev stack mounts the repository, so it already sees the folder.

**10. Content repositories.**
- `doc-example/AGENTS.md` keeps the common rules, routes to the `colofon-*` skills and says how to get them: the setup prompt, or `/llms.txt` on the platform the site is registered on. «Este sitio» states that platform's address.
- The rule "never edit `.agents/`" becomes "the writing skills are the platform's: never copy or edit them here; a problem with one goes to the user".
- The README and the guide's `publishing/writing-agents` and `publishing/agents` pages describe this flow and drop `doc-writing`.
- `doc-example` keeps `.agents/` only because it is the source.

## Risks / Trade-offs

- [A user installs the skills globally and also opens `doc-example`, which has the same `colofon-*` skills through `.claude/skills/`] → Same names and same text, so the agent sees one skill twice. That's harmless, and only the maintainer of `doc-example` hits it.
- [Thirteen platform skills make `/llms.txt` and the index longer] → One line each, and the setup procedure installs them all without the agent choosing.
- [`/.well-known/` stays public, so anyone can read the writing skills] → They are already public in the `doc-example` GitHub repository, and hold no secret (`agent-skills` forbids it).
- [Agents that installed `doc-writing` keep it] → `colofon`'s refresh rule says to drop skills the index no longer lists. Running the setup prompt again replaces everything.
- [A non-text file under a skill folder] → Reported by the platform test (problem), so it never reaches the archive builder.
- [`.dockerignore` negation is easy to get wrong] → The tasks include building the backend image and checking that `/app/doc-example/.agents/skills` exists.

## Migration Plan

1. Rename and convert the skills in `doc-example`, then update its `AGENTS.md`, README and pages.
2. Deploy the backend and frontend together: the routes and the index change at once.
3. Users run the new setup prompt once. Old `doc-writing` copies are replaced or removed as `colofon` instructs.
4. Push the `doc-example` subtree.
5. Homelab drops its `.agents/` in its own change.

Rollback is redeploying the previous images. Nothing is stored, so there is no data migration.
