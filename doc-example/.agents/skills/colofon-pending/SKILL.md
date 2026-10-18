---
name: colofon-pending
description: List what is still unknown or stale across a content repository, by section (open questions, pending lines, pages to review), to pick where to run a question round. Use when the user asks what is left to document, what is pending or which section to finish next.
---

Gather what the site still has to settle, without changing anything. What
counts as pending is in the `colofon-documentation` skill,
`references/question-rounds.md`, and the `colofon-docs` skill, `references/header.md`.

## Gather

1. Every `open_questions` entry in the headers of `docs/**/*.mdx`, when
   `doc.config.yaml` declares that header field.
2. Every "_Pending…_" line in the body of a page.
3. Every page whose `updated` is more than six months old, or missing:
   the platform shows "Revisar" on it.
4. If `questions.md` exists at the content root, say so first: a round is
   already open and `colofon-questions` will apply it.

## Reply

- Do not edit anything.
- One table per section (`docs/<section>/`): the page, and what is pending on
  it in one short line each.
- End with the sections ordered by how much they have pending, and suggest
  the first one to run `colofon-questions <section>` on.
