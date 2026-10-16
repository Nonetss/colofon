# This site's styles

One module, `estilos/tema.css`. It exists so the guide shows `estilos/`
working, as it does every other part of the contract. It changes only the
accent, so the reader sees at a glance that the site restyles the platform
without the guide looking unlike every other site.

| Module | What it sets | Why |
| --- | --- | --- |
| `tema.css` | `--primary` in `:root` (`oklch(0.55 0.17 255)`) and `.dark` (`oklch(0.72 0.13 255)`) | A blue accent instead of the platform's terracotta: links, bold, the sidebar's current page and the focus ring follow it in both themes |

## Why only the accent

- **One variable shows the whole mechanism**: the theme, both themes, and
  that this site wins over the platform. More would only be decoration.
- **The guide must read like any site.** Its readers are learning what the
  platform renders. A heavily restyled guide would show them something their
  own site won't look like by default.
- **Each extra module is a rule to keep in step** with the platform's
  classes. This site adds one only when a page needs to show it working.

## Adding a module

Add another module only when a page of the guide explains something that
needs it seen, for example a page about restyling callouts. Then:

1. Write only the rules that change, on the classes the guide documents
   (`writing-a-module.md`).
2. Add a row to the table above with what it sets and why.
3. Make the page that needs it say that this site's `estilos/<módulo>.css`
   is the example.

## The colours

The two values are the same hue (255, blue), lighter and less saturated in
the dark theme so links keep their contrast on the dark background. Change
both together. A new accent keeps:

- white text readable on it (`--primary-foreground` is white in both themes,
  on the primary buttons);
- links readable on the page background in each theme.
