---
description: List what is still unknown or stale across the site, by section, to pick where to run /doc:questions
---

Gather what the site still has to settle, without changing anything. What
counts as pending is in the `documentation` skill,
`references/question-rounds.md`, and the `docs` skill, `references/header.md`.

## Gather

1. Every `open_questions` entry in the headers of `docs/**/*.mdx`, when
   `doc.config.yaml` declares that header field.
2. Every "_Pending…_" line in the body of a page.
3. Every page whose `actualizado` is more than six months old, or missing:
   the platform shows "Revisar" on it.
4. If `questions.md` exists at the repository root, say so first: a round is
   already open and `/doc:questions` will apply it.

## Reply

- Do not edit anything.
- One table per section (`docs/<section>/`): the page, and what is pending on
  it in one short line each.
- End with the sections ordered by how much they have pending, and suggest
  the first one to run `/doc:questions <section>` on.
