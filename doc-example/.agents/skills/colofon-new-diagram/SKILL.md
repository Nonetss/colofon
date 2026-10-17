---
description: Pick the right form for a diagram, write it in diagrams/ and check it
argument-hint: <what it should show> [page where it goes]
---

Draw a diagram for the site. The rules are in the `diagrams` skill: when a
diagram earns its place, how to choose the form, the reference of each form,
`references/items.md`, `references/style.md` and `references/checking.md`.
Load it and read the reference of the form you pick before writing.

`$ARGUMENTS` says what the diagram should show and, optionally, the page it
goes on. If it is missing, ask me what it should show.

## 1. Decide

1. First ask whether a paragraph, a list or an `<Entities>` table would say it
   better ("When to draw"). If so, tell me and stop.
2. Before drawing a new one, check `diagrams/` for one that already says it
   ("The site's diagrams").
3. Pick the form with the skill's decision steps and tables: a typed form and
   its variant, a drawn recipe, or an `.svg` illustration.

## 2. Say the plan first

Tell me in one short message the form, the pieces it will hold, which ones
link to catalog entities or pages, the one or two in the accent, and what the
budget forces out. Wait for my OK unless `$ARGUMENTS` already pins all of it.

## 3. Write and check

1. Write `diagrams/<id>.json` (or `.svg`), named like the site's existing
   diagrams ("Writing and checking"). Keys in English; names, labels and
   `info` in the language of the site's prose.
2. If a page was given, add its `<Diagram id="…" />` in a block of its own,
   where the page needs it.
3. Check it as `references/checking.md` says, sections 1 and 2: valid JSON,
   keys its form takes, every `entity` and `page` exists, ids unique, within
   the budget, at most two accents.
4. For section 3 (how it reads drawn), ask me for a screenshot in light and
   dark theme; don't open the platform yourself.
