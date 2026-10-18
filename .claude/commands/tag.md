---
description: Create an annotated git tag for a version, with a message summarizing what changed
argument-hint: <version> (e.g. v0.1.0)
---

Create an annotated git tag named `$ARGUMENTS` (e.g. `v0.1.0`) summarizing what has changed since the previous tag.

Steps:

1. Validate `$ARGUMENTS` was actually provided and looks like a version (e.g. `v0.1.0`, `v1.2.3`). If it's missing or malformed, ask me instead of guessing.
2. Run `git status` to make sure the working tree is clean. If there are uncommitted changes, stop and tell me — do not tag a dirty tree, and do not commit on my behalf unless I ask you to.
3. Run `git tag -l --sort=-v:refname` to find the most recent existing tag (there may be none yet).
4. Determine the range of commits to summarize:
   - If a previous tag exists, use `git log <previous-tag>..HEAD --pretty=format:"%s"`.
   - If no previous tag exists, use the full history: `git log --pretty=format:"%s"`.
5. Give the app the release's version, so the account menu names the release it runs: run `scripts/set-version.sh $ARGUMENTS`. It sets `APP_VERSION` in `packages/api/src/shared/releases.ts`. If it changed anything, stage exactly that file and commit it as `chore(release): set the app version to <version>`, with no other files and no AI attribution. This commit is part of tagging and the only one this command makes; skip it when the version was already set.
6. Read those commit subjects and write a concise tag message that summarizes what was actually done — group by area/type (feat/fix/refactor/chore/docs) rather than just pasting the raw log. Keep it factual and grounded in the commits, don't invent changes.
7. Create an annotated tag (never a lightweight tag) on the current commit (the release commit, when step 5 made one) with that message:
   `git tag -a $ARGUMENTS -m "<message>"`
8. Show me the tag you created (`git show <tag> --no-patch`) and ask me whether I want it pushed. Never push the tag (`git push origin <tag>` or `git push --tags`) without me explicitly confirming it in this conversation.
