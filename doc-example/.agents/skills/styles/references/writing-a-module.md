# Writing a module

The rules behind each step are in the guide's `repository/styles` page.
Read it first: it lists the modules, the theme variables and the classes of
each module.

## Which file

| The piece | Module |
| --- | --- |
| Colours, fonts, radius for the whole site | `theme.css` |
| Headings, links, bold, inline code, anchors | `page.css` |
| The page's icon-only buttons and their bubble | `controls.css` |
| Code blocks | `code.css` |
| Catalog tables, page tables, their controls | `tables.css` |
| Diagrams and their pointer card | `diagrams.css` |
| Images and the viewer | `images.css` |
| Callouts and quotes | `callouts.css` |
| The repeated sections ("¿Dónde busco…?", "Trampas y decisiones") | `sections.css` |

The platform joins the modules in this order, after its own styles. Where two
of the site's modules set the same thing, the later one wins. Keep each rule
in the module of the piece it styles, so this order never matters.

## Theme variables

```css
:root {
  --primary: oklch(0.55 0.17 255);
}

.dark {
  --primary: oklch(0.72 0.13 255);
}
```

- **Both themes, always.** A variable only in `:root` leaves the dark theme
  on the platform's value.
- Write colours in `oklch()`, like the platform. Lightness is the first
  number, so tuning a colour for the dark theme is changing one number.
- Only the variables the guide lists. The platform's other variables are
  internal and may be renamed.

## Rules on a piece

```css
.typeset.doc .doc-alert-note {
  --alert: oklch(0.6 0.16 295);
}
```

- Start page-body selectors at `.typeset.doc`, like the platform. It gives
  the same weight as the platform's rule, and the site wins at equal weight
  because it comes after.
- Prefer the piece's own variable (`--alert`, `--section`, `--d-accent`) to
  rewriting its borders and backgrounds: the platform builds the tints from
  it.
- Write only what changes. Never paste a platform module whole.
- No `!important`. A rule that doesn't apply needs the selector the guide
  documents, not more force.

## Resources

- **Images**: from `docs/`, written relative to `styles/`:
  `url(../docs/img/fondo.png)`. The platform rewrites them to the reader's
  route. The image must exist and be one the reader serves (png, jpg, gif,
  webp, avif, svg).
- **Fonts**: as a `data:` URI in `@font-face`, or a system font. A web font
  from outside is removed.
- **Nothing else from outside**: `https://…`, `//…`, `@import`. The platform
  removes the whole declaration that holds it.

## Checking

- After the push and the sync, open the repository's **home** as an admin.
  The problems of `styles/` show there, with the file and the line: a
  removed `@import` or URL, a part the platform cannot read, a file that is
  not a module, a file over 64 KiB, or the stylesheet passing 128 KiB.
- A removed declaration is never an error the reader sees. The piece just
  keeps the platform's look, so check the home after every change.
- Look at the result in **both** themes, on a page with every piece the
  module touches: links, bold, code, tables, a callout, a diagram.
