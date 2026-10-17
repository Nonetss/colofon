---
description: Run a question round to finish documenting a section, or apply the answers already written in questions.md
argument-hint: <section> (a folder under docs/)
---

Run a **question round** as described in the `documentation` skill,
`references/question-rounds.md`. Load the skill and read that reference first:
it is the source of truth, and this command only says how to run it. Write in
the language of the site's prose.

Pick the phase from the state of the repository:

- **`questions.md` exists at the repository root and has answers under the `>`
  lines** → phase 2, apply the answers. `$ARGUMENTS` is not needed.
- **Otherwise** → phase 1, write the questions for the section in
  `$ARGUMENTS`. If it is missing or does not match a folder under `docs/`, ask
  me which section instead of guessing.

## Phase 1: write the questions

1. Read every page of the section (`docs/<section>/**/*.mdx`), the
   `open_questions` in their headers and any "_Pending…_" line in the text, and
   the catalog entities they cite.
2. Before asking anything, search the rest of `docs/` and `catalog/` for the
   answer. Do not ask what is already answered or what can be looked up.
3. Write `questions.md` at the repository root in the format of the reference:
   a `# Questions: <Section>` title, the three lines of instructions, the
   questions grouped by topic under `##` headings with the most common need first, each
   question in bold with just enough context, and an empty `>` line under it.
4. Follow "What to ask and what not" strictly: the documentation is for
   whoever uses or runs what it documents, not a review of it. Ask what the
   documented thing does in the cases a page doesn't cover, how something is
   done and where it is. Do not ask how its internals are coded, what another
   page or the catalog already answers, or about plans that don't exist yet. When a
   fact comes out of a command or a screen, ask for its output. Never ask for a
   secret's value.
5. Keep it short (around 15 questions at most), then tell me in a few lines
   what each section of the file asks about. Do not edit any page in this
   phase.

## Phase 2: apply the answers

1. Read `questions.md` and any screenshot it points to.
2. Re-read each page and entity before editing it: I may have changed it by
   hand in between, and my changes stay.
3. Move each answer to the page or entity where it belongs, written cleanly and
   without naming who answered. Follow every rule of the `documentation` skill
   (header, catalog, MDX without code, links, images in the page's own
   `img/`). If an answer contains a secret, do not copy it anywhere: note
   where it should be stored and tell me.
4. Close each open question completely: remove it from `open_questions` and
   from the text, and do not leave a leftover as a new open question. A
   question left blank or answered "doesn't matter" / "don't know" is also
   closed and never asked again. A topic someone else owns gets one line saying
   who runs it, and nothing more.
5. When an answer can be read two ways, write the most sensible reading and
   list it in your reply so I can correct it.
6. Check that every page and entity you touched still validates (header fields
   declared, ids and links that exist, YAML the editor accepts).
7. Delete `questions.md` once every answer is applied. Do not commit: I commit
   when I ask for it.
8. Reply with a short summary: what went where, what was closed without an
   answer, and the readings you chose.
