---
name: colofon-check
description: Check that a content repository validates (headers, links, ids, menu, diagrams, styles) and report every problem the platform would flag on the next sync, without editing. Use when the user asks to check, validate or lint the site, a folder or a file before pushing.
---

Check the content the way the platform will on the next sync, and report what
it would flag. The rules are in the `colofon-documentation` skill,
`references/validation.md` ("Before finishing"), and in the "Before finishing"
or "Checks" part of each folder skill; load `colofon-documentation` and read them
first. This command only says what to look at.

Scope: what the user names (a page, an entity, a diagram or a folder), or
the whole repository when they name nothing. Look up every target across the whole
repository even when the scope is one file.

## What to check

1. **Pages** (`docs/**/*.mdx`): the header as the `colofon-docs` skill's
   `references/header.md` asks (`titulo` and `descripcion` present, no
   `icono` where `menu.yaml` gives one), every header field declared under
   `cabecera` in `doc.config.yaml`, every id it cites present in
   `catalog/<type>/`, every folder with its `index.mdx`, nothing outside
   backticks or code blocks that MDX reads as code (`colofon-docs` skill,
   `references/mdx.md`).
2. **Links**: every link to a page, `catalog:` entity or table, image and
   `<Diagram id>` points at a file that exists (`colofon-docs` skill,
   `references/links.md`).
3. **Menu**: every page is shown by `menu.yaml` (none lands in "Otros"),
   every entry names a page or folder that exists, and a title set in the menu
   equals the page's `titulo` (`colofon-documentation` skill, `references/menu.md`).
4. **Catalog**: every entity declares only fields its `_type.yaml` declares,
   every `ref` and `ficha` (`page:`) points at something that exists, one
   entity per file (`colofon-catalog` skill, `references/writing-an-entity.md`).
5. **Diagrams** (`diagrams/*.json`): valid JSON, a known `type` or none,
   every `entity` and `page` exists, ids unique and every link names one of
   them (`colofon-diagrams` skill, `references/checking.md`, sections 1 and 2).
6. **Styles** (`styles/`): every file is a module name, no `@import` and
   no URL from outside, every `url()` to an image under `docs/` that exists,
   every theme variable set in both `:root` and `.dark` (`colofon-styles` skill,
   `references/writing-a-module.md`).
7. **Leftovers**: diagrams no page shows, images under an `img/` no page
   uses. These are warnings, not errors.
8. **Secrets**: anything that looks like a password, token, key or passphrase
   in any file. Stop and tell me before anything else if you find one.

Use `rg` and `ls` to check; don't probe the running platform.

## Report

- Do not edit anything.
- One list per file with a problem: the line, what is wrong and the fix, as
  the platform would phrase it when the reference quotes its message.
- Then the warnings, then a one-line total. If everything passes, say so in
  one line.
- Ask whether to fix them; when I say yes, fix only what was reported.
