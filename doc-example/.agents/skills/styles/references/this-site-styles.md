# This site's styles

One module, `styles/theme.css`. It exists so the guide shows `styles/`
working, as it does every other part of the contract. It changes only the
accent, and sets it to the platform's own terracotta, so the guide shows
the mechanism while looking exactly like every other site.

| Module | What it sets | Why |
| --- | --- | --- |
| `theme.css` | `--primary` in `:root` and `.dark` (`oklch(0.6724 0.1308 38.7559)` in both) | The platform's terracotta accent, written out: links, bold, the sidebar's current page and the focus ring follow it in both themes |

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
3. Make the page that needs it say that this site's `styles/<módulo>.css`
   is the example.

## The colours

Both values are the platform's `--brand-orange`, which it uses unchanged in
the light and dark themes. Change both together. A new accent keeps:

- white text readable on it (`--primary-foreground` is white in both themes,
  on the primary buttons);
- links readable on the page background in each theme.
