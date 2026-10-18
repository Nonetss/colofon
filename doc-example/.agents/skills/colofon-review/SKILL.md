---
name: colofon-review
description: Review a page, entity, diagram or style module against the writing conventions and list what to improve, without editing. Use when the user asks to review, critique or improve one file of the site.
---

Review one file the way an editor of this site would. `colofon-check` covers
what the platform reports; this review covers how well the file follows the
conventions. Load the `colofon-documentation` skill and the skill of the file's
folder, read the references named below and the «Este sitio» section of
`AGENTS.md` first.

The file is the one the user names. If they name none or it does not exist,
ask me which one.

## What to look at

- **A page** (`colofon-docs` skill): the shape and anti-patterns of
  `references/writing-a-page.md` (the answer first, procedures as numbered
  steps, what goes wrong, "¿Dónde encuentro…?" on an `index.mdx`), the
  header of `references/header.md` (a `description` that says what the
  reader learns, the entities it is about cited), the anti-patterns of the
  skill, hand-typed tables of catalog data, facts restated from another page
  instead of linked, unknowns buried in the prose instead of in the site's
  open questions, platform UI words as the platform shows them, and the
  site's own conventions from `AGENTS.md`.
- **An entity** (`colofon-catalog` skill): `references/writing-an-entity.md`, and
  whether its values still match their source (its `source`).
- **A diagram** (`colofon-diagrams` skill): whether it earns its place, whether the
  form fits, the universal anti-patterns and those of its form's reference,
  the density (4/10) and the accent.
- **A style module** (`colofon-styles` skill): a variable where one would do instead
  of rules, both themes, only the classes and variables the guide's
  `repository/styles` page documents, contrast in each theme, and the
  anti-patterns of the skill.
- **Always**: the contract's names untouched (`colofon-documentation` skill,
  `references/contract-names.md`), and no secret anywhere.

## Reply

- Do not edit anything.
- The problems ordered by how much they hurt the reader, each with where it
  is, what is wrong and the change you suggest. Skip what is fine.
- If it is in good shape, say so in one line.
- Ask whether to apply them; when I say yes, apply only the ones I keep.
