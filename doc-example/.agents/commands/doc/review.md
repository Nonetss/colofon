---
description: Review a page, entity, diagram or style module against this site's conventions and list what to improve, without editing
argument-hint: <path> (a page, an entity, a diagram or a style module)
---

Review one file the way an editor of this guide would. `/doc:check` covers what
the platform reports; this review covers how well the file follows the
conventions. Load the `documentation` skill and the skill of the file's
folder, and read the references named below first.

`$ARGUMENTS` is the file. If it is missing or does not exist, ask me which
one.

## What to look at

- **A page** (`docs` skill): the shape and anti-patterns of
  `references/writing-a-page.md` (example first, keys tables with
  "Obligatoria."/"Opcional.", "Qué se reporta", shown working, "¿Dónde
  encuentro…?" on an `index.mdx`), the header of `references/header.md`
  (a `descripcion` that says what the reader learns, the entities it explains
  cited), the anti-patterns of the skill, hand-typed tables of catalog data,
  rules restated from another page instead of linked, unknowns buried in the
  prose instead of in `open_questions`, platform UI words as the platform
  shows them.
- **An entity** (`catalog` skill): `references/writing-an-entity.md`, and
  whether its values still match the platform (`references/keeping-in-step.md`).
- **A diagram** (`diagrams` skill): whether it earns its place, whether the
  form fits, the universal anti-patterns and those of its form's reference,
  the density (4/10) and the accent.
- **A style module** (`styles` skill): a variable where one would do instead
  of rules, both themes, only the classes and variables the guide documents,
  contrast in each theme, and the anti-patterns of the skill.
- **Always**: the contract's names untouched (`documentation` skill,
  `references/contract-names.md`), and no secret anywhere.

## Reply

- Do not edit anything.
- The problems ordered by how much they hurt the reader, each with where it
  is, what is wrong and the change you suggest. Skip what is fine.
- If it is in good shape, say so in one line.
- Ask whether to apply them; when I say yes, apply only the ones I keep.
