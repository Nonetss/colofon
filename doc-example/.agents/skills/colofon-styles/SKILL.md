---
name: styles
description: The styles/ folder of a doc platform content repository, the site's own CSS that the platform cleans and applies over its own styles on the site's pages, one file per platform module (theme.css, page.css, controls.css, code.css, tables.css, diagrams.css, images.css, callouts.css, sections.css). A decision guide for theme variables vs a module rule, writing a module (both themes, only the documented classes and variables, resources from docs/ or data:), what the platform removes and where it is reported. Use before adding or changing any file under styles/, before restyling a piece of the reader, and when the platform reports a problem on styles/.
---

# Styles (`styles/`)

One CSS file per platform style module in `styles/`, named after it
(`theme.css`, `tables.css`…), all optional. The platform reads them with the
pages, cleans them (no `@import`, no resource from outside, nothing it cannot
parse) and applies them **after** its own styles, only on the site's pages.
Where both set the same thing with the same selector, the site wins. How
`styles/` works (the modules, the theme variables, the classes of each
module, what is removed, the limits) is explained in the guide's
`repository/styles` page. This skill is how **you** write the site's styles
well; why the site styles what it does, when it says, is in `AGENTS.md`
(«Este sitio»). The repository as a whole is in the `documentation` skill.

## 1. Philosophy

**Change a variable before writing a rule.**

- The platform draws every piece of the page with the theme's variables, so
  one variable in `theme.css` restyles links, bold, the sidebar's current page
  and the focus ring at once, in step. A rule on one class restyles one
  piece and starts drifting from the rest.
- **Small.** Every module is a rule to keep in step with the platform's
  classes; add one only when a page needs it, and ask the user before
  restyling the site on your own initiative.
- **Readable first.** A style that hurts contrast in either theme is a bug,
  however good it looks in one.
- **Only the documented names.** The classes and variables listed in the
  guide's `repository/styles` page are the contract. Anything else the platform
  may rename without notice.

## 2. Variable or rule?

| You want… | Write |
| --- | --- |
| Another accent, background, text colour, border, radius or font | A variable in `theme.css`, in `:root` and in `.dark` |
| One piece to look different (the note callouts, the table headers) | A rule in that piece's module (`callouts.css`, `tables.css`) on the documented class |
| A colour of one piece that the platform exposes as a variable (`--alert`, `--section`, `--d-accent`) | That variable, set on the piece's class in its module |
| An image behind something | `url(../docs/<path>)` to an image under `docs/`, never a URL from outside |
| A font the system doesn't have | A `data:` font in `@font-face`, or a system font. Web fonts are removed |

## 3. Where to look

| Task | Read |
| --- | --- |
| What the site's `styles/` holds and why | `styles/` itself and `AGENTS.md` («Este sitio») |
| Writing or changing a module: names, order, both themes, resources, checking | [writing-a-module.md](references/writing-a-module.md) |
| The modules, the theme variables, each module's classes, what is removed, the limits | The guide's `repository/styles` page |

## 4. Always true

- **File names are the module names**, exactly: `theme.css`, `page.css`,
  `controls.css`, `code.css`, `tables.css`, `diagrams.css`,
  `images.css`, `callouts.css`, `sections.css`. Any other file in
  `styles/` is reported and ignored. A folder called `styles/` is never
  read.
- **Every theme variable goes in both themes**: `:root` (light) and `.dark`
  (dark), with a value tuned for each.
- **Selectors use only the classes and variables the guide documents**, and
  start at `.typeset.doc` for the page body, like the platform's own.
- **No `@import` and no URL from outside** (`https://…`, `//…`): the
  platform removes them. Images come from `docs/` (`url(../docs/img/x.png)`,
  written from `styles/`); fonts, as `data:`.
- **When the platform changes a module, a class or a variable, the site's
  `styles/` changes with it.**
- Comments in the site's prose language. The platform drops them before
  serving.
- **No secret**, not even in a comment.

## 5. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| A rule on every class to recolour the site | One `--primary` does it, in step; the rules drift as the platform changes |
| A variable set only in `:root` | The dark theme keeps the platform's colour, or worse, mixes both |
| `@import url(https://fonts…)` or a background from a CDN | Removed and reported; the page falls back with no warning to the reader |
| Styling an undocumented class (`.flex`, a Tailwind utility, a React island's internals) | It changes without notice and the style silently stops applying |
| `!important` everywhere | The site already wins at equal weight. `!important` hides which rule applies and breaks the next override |
| A whole platform module pasted in and edited | Copies rules that will drift; write only what changes |
| A file named `tables.css` or a folder `styles/` | Reported as not a module, or never read at all |
| A colour that only works in one theme | Unreadable text in the other one |

## 6. Before finishing

- Every file in `styles/` is a module name, and every variable you set is
  in `:root` and `.dark`.
- Every class and variable you used is in the guide's `repository/styles`
  page.
- After the push and the sync, open the repository's home as an admin: no
  problem on `styles/` (`references/writing-a-module.md`, "Checking").
- Look at a page with links, bold, code, a table, a callout and a diagram,
  in **both** themes, and check that the text still reads.
