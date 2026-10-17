---
name: colofon-new-page
description: Write a new documentation page with its header, its menu entry and its row in the section's "¿Dónde encuentro…?" table. Use when the user asks to add, create or write a new page about a topic in a section.
---

Write a new page of this repository. The rules are in the `colofon-docs`
skill (`references/sections-and-naming.md`, `references/header.md`,
`references/writing-a-page.md`, `references/mdx.md`,
`references/components.md`, `references/links.md`) and in the
`colofon-documentation` skill (`references/menu.md`). Load both skills and read those
references first, and the «Este sitio» section of `AGENTS.md`: they are the
source of truth, and this command only says how to run it.

The user names the section (a folder under `docs/`) and the topic. If either
is missing, or the topic is already covered by another page, ask me instead
of guessing. A section that does not exist yet means a new folder, its
`index.mdx` and its menu group: say so in the plan.

## 1. Say the plan first

Before writing, tell me in a short message: the path and file name, the
`titulo` and `descripcion`, its `orden`, the entities its header will cite,
the parts of the page shape it will have, any diagram or `<Entities>` it will
show, and the menu entry. Wait for my OK unless the request already pins all
of it.

## 2. Write it

1. Read the section's `index.mdx` and its neighbouring pages so the new one
   reads like them.
2. Write the page in the shape of `writing-a-page.md` and of its
   neighbours: the answer first, then the details and what goes wrong.
   `actualizado` is today.
3. Facts come from a source: what I tell you, the existing pages and
   catalog, or the system the page documents. Anything you cannot settle is
   an open question (`references/header.md`), never invented.
4. Add the menu entry in `menu.yaml` and a row in the section's "¿Dónde
   encuentro…?" table.
5. If it explains a catalog entity, cite it in the header; if the entity's
   `page` should point here, update it (`colofon-catalog` skill).

## 3. Finish

Check every file you touched as `colofon-check` does. Reply with the files you
wrote or changed and the `open_questions` you left, so I can run
`colofon-questions` on them.
