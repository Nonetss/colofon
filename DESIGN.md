---
name: doc
description: A quiet-editorial technical console on monochrome paper with one warm accent.
colors:
  primary: "oklch(0.6724 0.1308 38.7559)"
  neutral-bg: "oklch(0.9818 0.0054 95.0986)"
  neutral-fg: "oklch(0.26 0.0269 95.7226)"
  neutral-muted: "oklch(0.45 0.0078 97.4503)"
  neutral-card: "oklch(0.9665 0.0067 97.3521)"
  neutral-card-fg: "oklch(0.1908 0.002 106.5859)"
  neutral-muted-surface: "oklch(0.9341 0.0153 90.239)"
  neutral-popover: "oklch(1 0 0)"
  neutral-border: "oklch(0.94 0.003 97.3627)"
  neutral-input: "oklch(0.92 0.004 98.3528)"
  destructive: "oklch(0.1908 0.002 106.5859)"
  destructive-fg: "oklch(1 0 0)"
  dark-bg: "oklch(0.2679 0.0036 106.6427)"
  dark-fg: "oklch(0.9576 0.0027 106.4494)"
  dark-muted: "oklch(0.84 0.0169 99.0657)"
  dark-card: "oklch(0.2928 0.0018 106.5092)"
  dark-muted-surface: "oklch(0.2213 0.0038 106.707)"
  dark-popover: "oklch(0.3085 0.0035 106.6039)"
  dark-border: "oklch(0.31 0.004 106.8928)"
  dark-input: "oklch(0.34 0.005 100.2195)"
  dark-destructive: "oklch(0.6368 0.2078 25.3313)"
typography:
  sans:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
  mono:
    fontFamily: "Space Mono, ui-monospace, monospace"
  display:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  meta:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.625
  status:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    lineHeight: 1.35
    letterSpacing: "0.08em"
    textCase: "uppercase"
  data:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  stat:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Space Grotesk Variable, Space Grotesk, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.12em"
    textCase: "uppercase"
rounded:
  sm: "calc(0.375rem - 4px)"   # 2px
  md: "calc(0.375rem - 2px)"   # 4px
  lg: "0.375rem"               # 6px (radius base)
  xl: "calc(0.375rem + 4px)"   # 10px — table boxes, tiles, state cards (rounded-xl)
  full: "9999px"
spacing:
  px: "0.25rem"                # Tailwind 1 unit
  gap-section: "1.5rem"        # gap-6 (gap-4 below sm) between header and content
  padding-page: "1.5rem"       # py-6
  padding-shell: "1rem"        # px-4 on mobile
  stagger-row: "40ms"          # --dash-delay between list rows
components:
  page-shell-default:
    padding: "{spacing.padding-page}"
    width: "80%"               # lg:max-w-[80%], full width below lg — the default
  page-shell-profile:
    padding: "{spacing.padding-page}"
    width: "48rem"             # 3xl — /me only
  page-hero-title:
    typography: "{typography.display}"
  surface-card:
    backgroundColor: "oklch(0.9665 0.0067 97.3521 / 0.4)"  # bg-card/40
    rounded: "{rounded.xl}"
    padding: "1rem"
  data-table-box:
    backgroundColor: "oklch(0.9665 0.0067 97.3521 / 0.4)"  # bg-card/40
    rounded: "{rounded.xl}"
  data-table-head:
    typography: "{typography.label}"
    textColor: "{colors.neutral-muted}"
    height: "2.25rem"          # h-9
    padding: "0 0.75rem"
  data-table-cell:
    typography: "{typography.body}"
    padding: "0.625rem 0.75rem"
  state-card-default:
    backgroundColor: "oklch(0.9665 0.0067 97.3521 / 0.4)"  # bg-card/40
    rounded: "{rounded.xl}"
    padding: "4rem 1.5rem"
  form-dialog-header:
    padding: "1.25rem 1.5rem"
    typography: "{typography.display}"
  field-label:
    typography: "{typography.label}"
    textColor: "{colors.neutral-muted}"  # full opacity (4.92:1 light / 7.36:1 dark — /80 failed WCAG AA at 3.33:1)
  section-heading:
    typography: "{typography.label}"
    textColor: "{colors.neutral-muted}"
  status-tag:
    typography: "{typography.status}"
    textColor: "{colors.neutral-muted}"
  hint:
    backgroundColor: "{colors.neutral-fg}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "oklch(1 0 0)"  # --primary-foreground
    rounded: "{rounded.md}"
  nav-pill-active:
    backgroundColor: "oklch(0.6724 0.1308 38.7559 / 0.1)"  # bg-primary/10
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.75rem"
  kbd:
    backgroundColor: "{colors.neutral-muted-surface}"
    textColor: "{colors.neutral-muted}"
    typography: "{typography.data}"
    height: "1.25rem"
  search-result-tile:
    backgroundColor: "oklch(0.6724 0.1308 38.7559 / 0.1)"  # bg-primary/10; fills solid primary when the row is selected
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    size: "2rem"
  filter-chip:
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.md}"
    height: "1.75rem"          # h-7
    padding: "0 0.25rem 0 0.625rem"
  filter-chip-exclude:
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    height: "1.75rem"
  segmented-option:
    textColor: "{colors.neutral-muted}"
    rounded: "{rounded.md}"
    height: "2rem"             # h-8
  segmented-option-selected:
    backgroundColor: "{colors.neutral-fg}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    height: "2rem"
  list-action-bar:
    backgroundColor: "oklch(0.9818 0.0054 95.0986 / 0.95)"  # bg-background/95
    padding: "0.75rem 1rem"
  list-action-bar-button:
    height: "2.75rem"          # h-11, 44px touch target
    rounded: "{rounded.md}"
  scroll-to-top:
    backgroundColor: "{colors.primary}"
    textColor: "oklch(1 0 0)"
    size: "2.75rem"            # size-11 mobile, size-9 on md+
    rounded: "{rounded.full}"
---

# Design System: doc

## Overview

**Creative North Star: "El Espacio de Trabajo Sereno."**

doc is a quiet-editorial technical console. Every page reads like a watchmaker's catalogue page or a typeset datasheet: a single primary hero, a facts strip or a ruled table, and a state column — never a wall of cards. The personality is **typography-first, monochrome-by-default, one-accent-by-policy**: hierarchy comes from size, weight, tracking, and tabular numerals, not from a rainbow of semantic colors. The single warm accent (Brand Terracotta) marks where you are, what to do and what is alive: the hero icon, the primary CTA, the "alive" state dot, the active navigation item and an active filter. Everything else is the foreground/muted-foreground/border vocabulary of a printed page.

Density is calm rather than compact. Containers are flat by default (no shadows, no glows); depth comes from hairlines (`border-y`, `divide-y`, table row rules) and one `rounded-xl border bg-card/40` box per data block — the table's scroll box, a navigation tile, a state block. Motion is short and useful: a 0.3s staggered entrance (`dash-enter`, ~40ms per item), a 0.25s pop (`dash-pop`) for nested icons, and 200ms slides for floating chrome. The product lives in a wide rhythm — `PageShell` and `Detail.astro` default to 80% of the viewport from `lg`, full width below — always headed by `PageHero`, with in-page grids and tables sized by container queries so columns follow the space beside the sidebar. Anti-references: "shadcn by default with badge primary + badge outline + icon box primary/15", and any surface that uses cards where a ruled table or list would do.

**The Marginalia Rule.** Every screen must pass this test: if the design "shows up" because it adds color, a card, a glow, or a chip cluster, it is almost certainly out of style. It earns notice by making the eye land on the name, the expression, and the state — not on the chrome.

**Key Characteristics:**

- Monochrome page; one warm accent for "here, act, alive".
- Hierarchy lives in type, not color.
- Lists are data tables in one rounded box (stacked rows below the table breakpoint), not free-floating cards.
- Hairlines (`border-y`, `divide-y`, table row rules, dialog `border-b`/`border-t`) carry structure.
- Motion is staggered entrance + pop, never decorative.

## Colors

The palette is a single neutral ramp (paper → ink → mute → border) plus one warm accent for brand voice and one destructive ramp for irreversible failure. No semantic colors are invented for success/info/warning — state is communicated with type and dots, not pills.

### Primary

- **Brand Terracotta** (`oklch(0.6724 0.1308 38.7559)`): warm, between vermilion and ochre, calibrated for daylight paper. Full strength on (a) the hero icon and tile icons at `size-5`, (b) the primary CTA and the floating back-to-top control, (c) the "active / running" state dot, (d) the top layer of the logo and the current page's icon in the documentation sidebar, (e) links inside rendered markdown and text selection. As a 10% tint (`bg-primary/10 text-primary`) it marks the active menu row, the search result tile and an active header filter; as a hairline it marks a column being resized or dropped. Aliases: `--brand-orange`, `--primary`, `--ring`, `--sidebar-primary`, `--chart-1`, `--icon-orange`.

### Tertiary (Destructive)

- **Editorial Ink** (`oklch(0.1908 0.002 106.5859)`, light theme destructive): reads as near-black. Sole use: errors, deletions, a missing handler, an irreversible action. Paired text color is white (`oklch(1 0 0)`). In dark mode the destructive ramp shifts to a true red (`oklch(0.6368 0.2078 25.3313)`) only because `oklch` ink-on-paper invert is otherwise too quiet in dark.

### Neutral

- **Paper** (`oklch(0.9818 0.0054 95.0986)`): page background — `--background`. A warm, near-white paper; the card sits one step *darker* than it and the popover is pure white, so menus lift off the page.
- **Ink** (`oklch(0.26 0.0269 95.7226)`): body text — `--foreground`.
- **Mute** (`oklch(0.45 0.0078 97.4503)`): secondary text, descriptions, dates, hints, table headers — `--muted-foreground`.
- **Card** (`oklch(0.9665 0.0067 97.3521)`, used at 40% opacity via `bg-card/40`): the surface tint for table boxes, navigation tiles, and state blocks.
- **Card Ink** (`oklch(0.1908 0.002 106.5859)`): high-contrast text on cards.
- **Muted Surface** (`oklch(0.9341 0.0153 90.239)`): the hover/fill tone — `bg-muted/40`–`/50` row hover, `bg-muted` tile hover, shortcut pills, keycaps, day-group rows at `/30`.
- **Popover** (`oklch(1 0 0)`): menus, popovers, the command dialog and the mobile nav sheet.
- **Border** (`oklch(0.94 0.003 97.3627)`): all hairlines — table rules, list dividers, dialog headers/footers, fact rows, tile borders; also the scrollbar thumb.
- **Input** (`oklch(0.92 0.004 98.3528)`): the resting line of text inputs and unselected picker cells.

Dark theme mirrors the same roles with a slightly warm dark surface (`oklch(0.2679 0.0036 106.6427)`, card one step lighter, muted surface one step darker, popover the lightest layer) and the accent stays Brand Terracotta — the warm accent survives the inversion.

### Scoped Palettes

Three palettes in `apps/frontend/src/styles/global.css` carry hues other than terracotta. Each is confined to the one place named here; none of them may leak into chrome, status or copy.

- **Chart palette** (`--chart-1` … `--chart-6`, read by the `Chart` primitive through `.ts-chart-host`): categorical series in data visualisations only. `--chart-1` is Brand Terracotta. A chart that encodes *status* (the cron run pulse) ignores it and paints with the status vocabulary instead: ink for success, destructive for failure, muted for skipped, primary for running.
- **Syntax palette** (`--th-*`, for `@tanstack/highlight` tokens): code inside `JsonView`. Properties use the primary, comments the mute; operators and punctuation keep the text color.
- **Entity icon palette** (`--icon-*`, keyed by name in `features/entity-icons/picker/model/palette.ts`): the user-selectable color of an entity's icon. No entity type is registered yet (`entityIconTargets` is empty); a consumer that passes `allowColor={false}` renders in `--icon-orange` (= primary), and the other hues stay dormant until a screen opts in.

### Named Rules

**The One Accent Rule.** Brand Terracotta is the only chromatic voice in product chrome, and it speaks only for *here* (active navigation, current section), *act* (primary CTA, back-to-top, active filter) and *alive* (running dot, hero icon). It is **never** used for badges, success indicators, info, or warning, and never as a large fill behind content. Full-strength fills are limited to buttons, the selected search tile and the running dot; everything else is the 10% tint or the bare glyph.

**The No-Green-No-Blue-No-Amber Rule.** Inventing semantic colors for success/info/warning is prohibited. Success is communicated by a `bg-foreground` dot and the word "ok"; failure is the destructive ramp above; everything else is mute. The Scoped Palettes above are not semantic and do not count as exceptions to this rule.

## Typography

**Display / Sans:** Space Grotesk Variable (Space Grotesk fallback), `font-sans`.
**Body:** Space Grotesk Variable — same family as display, sized down.
**Mono:** Space Mono (`font-mono`), reserved for expressions, cron strings, IDs, durations, and any value that needs `tabular-nums`. Never the default for UI copy. Ships as static 400/700 weights only — no variable axis.

**Character.** The pairing reads like a technical zine: a geometric sans with a distinctive squared-off personality (Space Grotesk) for prose, paired with a typewriter-precise monospace (Space Mono) for technical values. There is no third face — no serif display, no system fallback masquerading as a choice. System fonts are explicitly excluded by the brand commitment.

### Hierarchy

Every role below is a `variant` of the `Text` component (`components/shared/brand/typography.tsx`), which owns its full recipe on top of the `--font-size-*` / `--line-height-*` / `--tracking-*` tokens in `global.css`. Call sites pick a role and a tone (`default`, `muted`, `primary`, `destructive`) and keep only layout in `className`; components that can't be a `Text` (shadcn primitives, `button`, `summary`, `Input`) take the same classes through `textVariants({ role, tone })`.

- **Display** (`font-semibold`, `text-lg`, `tracking-tight`, `line-height: 1.2`): the page `<h1>` — the `PageHero` title on overview and detail pages, the name on the `/me` identity row, the 404 heading — and the title of a celebrate `StateCard`. Single line, never eyebrowed.
- **Headline** (`font-medium`, `text-base`, `tracking-tight`): the title of a muted or destructive `StateCard`, list/tile/dialog titles. Never resized with a `text-*` override; a title that needs more weight takes Display.
- **Title** (`font-medium`, `text-sm`, `tracking-tight`): the name on a tile (`SurfaceCard`), a table identity cell, a picker or search result, or a selected entity — the body-size counterpart to Headline.
- **Body** (`text-sm`, `line-height: 1.5`): prose, form values, fact values inside `MetadataCell`.
- **Meta** (`0.8125rem`, `leading-relaxed`): secondary copy — descriptions, hints, hero counters, inline errors.
- **Meta-sm** (`0.6875rem`, sentence case): inline metadata inside dense rows (suggestion details).
- **Label** (micro-caps, `0.6875rem`, `font-medium`, `uppercase`, `0.12em` tracking, `muted-foreground` at full opacity): the recurring field label in fact rows, form fields, filters, section headings and tile subaccess. This is the signature detail that ties the whole system together. Full opacity, not `/80` — the faded version fails WCAG AA contrast (3.33:1 light mode).
- **Status** (`text-xs`, `uppercase`, `0.08em` tracking): state words ("Vigente", "En pausa"); `StatusTag` adds the dot.
- **Stat** (`1.5rem`, `font-medium`, `tabular-nums`, `line-height: 1.1`): a single big number in an overview fact cell (admin overview counters).
- **Data** (`Space Mono`, `text-xs`, `tabular-nums`, `tracking-tight`): any technical value — cron expressions, durations, ISO timestamps, IDs, keys, JSON, chart axis dates. Keycaps (`Kbd`) use the same face at the 11px label size.
- **Compact** (`text-xs`): any other dense copy — tile and menu descriptions, a table cell's sub-line, dialog and sheet descriptions, counts beside section titles, footers.

### Named Rules

**The Tabular-Nums Rule.** Any column or list of values rendered with `font-mono` must include `tabular-nums` so digits line up. Default Tailwind doesn't apply it; add it on every mono block that aligns.

**The Label-Not-Badge Rule.** Field labels, counts, and statuses are typeset as **micro-caps text**, not as `Badge` components. If a value can be expressed as `<FieldLabel/>` it must be.

**The Role-Not-Utility Rule.** Text is set through a `Text` role, never by rebuilding `font-medium text-label uppercase tracking-[0.12em]` or `text-xs text-muted-foreground` at the call site. A new recurring type style becomes a new role (token in `global.css`, recipe in `textVariants`, name registered in `cn()`), not a copied class string.

## Layout

**The default width is 80%.** `PageShell`, `ResourceOverview` and `Detail.astro` all default to `maxWidth="80%"`: full width below `lg`, capped at `lg:max-w-[80%]` from there, centred, with `px-4 py-6 sm:px-6` padding. The admin pages use `full` instead, filling the inset beside the admin sidebar. Narrower caps are deliberate exceptions: `3xl` (48rem) for `/me`, a single compact profile block with no hero. The documentation reader (`Docs.astro`) doesn't use `PageShell`: it sets the page in a reading column (`max-w-4xl`, `max-w-5xl` on the "Todos" home) between the `w-64`/`lg:w-72` sidebar and the `w-56` "En esta página" table of contents (from `xl`). **Detail routes** (none today) don't use `PageShell`: `Detail.astro` owns its own `<main>` plus the back link with the same `maxWidth` prop, and the mounted island renders `PageHero` directly inside a bare `QueryProvider`, never a second `PageShell` (that would nest a second `<main>`). Detail pages take the same width as their overview, never narrower. Whichever wrapper is in play, the inner `.astro` file never adds a second `<main class="container…">`.

**Columns follow the container, not the viewport.** In-page grids and tables size themselves with container queries, because the usable width changes with the sidebars (the admin sidebar expanded or icon-collapsed, the documentation sidebar beside the reading column). Tile grids (`SurfaceCardGrid`) step `1 → @xl:2 → @4xl:3 → @6xl:4 → @min-[90rem]:5`; a data table switches from stacked rows to a real table at `@4xl/table`; fact grids (`MetadataCell`) and filter panels step at `@md`/`@xl`/`@3xl`. Viewport breakpoints are reserved for chrome (navbar, sidebar, bottom action bar).

Vertical rhythm is `gap-4` below `sm` and `gap-6` from `sm` between the header (`PageHero`) and the content block, `gap-2.5` between the hero icon column and the title, `gap-4` between sibling sections in a dialog body, and `gap-5` (`py-5`) inside a fact row. Card grids use `gap-3`. Spacing is on the 0.25rem Tailwind unit; nothing is invented outside the existing scale.

Sticky chrome is reserved for `Navbar` (fixed, `z-40`) (height `--navbar-height: 3.6rem` ≈ h-14), the documentation sidebar and its table of contents (pinned below the navbar, `h-[calc(100dvh-var(--navbar-height))]`) and `Footer` (`--footer-height: 13rem` stacked on mobile, `7.6rem` single-row on `sm+`). The layout utility `min-h-main` fills the remaining vertical space without hardcoding heights.

**Below `md` (768px), list pages gain bottom chrome.** Filters leave the inline panel and move to a fixed bottom `ListActionBar` (`border-t`, `bg-background/95 backdrop-blur-sm`, `px-4 pt-3`, bottom padding `0.75rem + env(safe-area-inset-bottom)`). It slides away (`translate-y-full`, 200ms ease-out) on scroll down and returns on scroll up, so it never covers what is being read. While visible it publishes `--list-action-bar-offset` (4.25rem) on `:root`; the floating back-to-top control adds that offset to its `bottom` so the two never overlap, and drops back to the corner when the bar hides. Every fixed bottom element respects the safe-area insets; touch targets on this chrome are 44px (`h-11` / `size-11`). Under a coarse pointer every icon-only button (`icon-xs` … `icon-lg`) also grows an invisible 44px hit area around its unchanged visible box.

## Elevation & Depth

**Flat by default. Borders carry structure.** Shadows are present in the token system (`--shadow-sm` … `--shadow-2xl`) because shadcn/ui requires them, but they are not the design's vocabulary. A table is one `rounded-xl border bg-card/40` box with hairline row rules, never a stack of cards with `shadow-md`. A state block is `rounded-xl border border-dashed bg-card/40`, never a card with `shadow-lg`.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (navbar scroll cue, dialog overlay, menus and popovers) and use the project's soft ramp, which is deliberately shallow (`--shadow-md` = `0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.1)`). Decorative `shadow-md` / `shadow-lg` / `shadow-xl` on rows, tiles, or heroes is out of style.

**The Floating-Layer Exception.** Elements that float over scrolling content need to read as detached from the page beneath them. The fixed `ListActionBar` and the navbar do it with a hairline over a translucent, blurred background (`bg-background/95` / `/80` + `backdrop-blur`). The round back-to-top control in the bottom-right corner carries the system's only resting `shadow-lg`, because a round control hovering over arbitrary content has no hairline to lean on. Popovers and the navigation dropdown pair a light `shadow` with a `ring-1 ring-foreground/10` hairline. Nothing anchored in the page flow inherits this.

Depth instead comes from:

1. **Hairlines.** Row rules inside tables, `divide-y` in stacked lists, `border-y` on fact blocks, `border-b` + `border-t` on dialog header/footer. A sticky table header draws its bottom rule as an inset shadow (`shadow-[inset_0_-1px_0_0_var(--border)]`) so the line stays put while rows scroll under it.
2. **Tonal layering.** `bg-card/40` (40% opacity over `card`) for table boxes, tiles and state blocks — quieter than a card, more present than the page. The box is `surfaceVariants()` (see Surface below), never a rebuilt class string. Inside a box, `bg-muted/30` sets apart a group row and `bg-muted/40`–`/50` marks hover.
3. **Inversion.** Tooltips (`Hint`, chart tooltips) invert to ink-on-paper (`bg-foreground text-background`), reading as a floating layer without leaning on shadow.
4. **Dashed state.** Empty/error/loading states use `border-dashed` to read as a placeholder, not a container.
5. **Focus ring.** `ring-2 ring-ring` (Brand Terracotta, `/50` on most controls) on keyboard focus only — never a permanent decoration.

## Shapes

The form language is restrained. Boxes — table scroll boxes, tiles, state cards — use `rounded-xl` (10px): corners visible enough to read as a "block" without screaming for attention. Inline controls (button, input, chip, search tile) step down to `rounded-md` (4px) or `rounded-lg` (6px, the base `--radius: 0.375rem`); menu rows and icon-grid cells use `rounded-lg`. Only the floating back-to-top control, status dots and color swatches are fully round. Sheets that rise from the bottom get `rounded-t-xl`.

Borders are full hairline width (1px). `border-dashed` is reserved for empty/error/loading blocks. `border-solid` is reclaimed for the success/celebrate variant of `StateCard`. Accent-colored strokes are 1–2px *markers*, never frames: the active row bar in the mobile menu (`w-0.5`), a column's drop marker and resize line.

There is no decorative clipping (no blob masks, no wave dividers, no svg ornaments) and no background texture: the login/signup card sits on the plain `background`.

## Components

The shared primitives — `PageShell`, `PageHero`, `DataTableView`, `StateCard`, `FormDialog`, `FormField`/`FieldLabel`, `CollapsibleFilters`/`FilterField`, `SearchInput`, `SectionNavOverview` — are the system, plus the `Detail.astro` layout that frames detail routes server-side. shadcn/ui (`components/ui/**`) provides the building blocks (Button, Input, Dialog primitives, etc.) but the editorial chrome always lives in `shared/`.

### Shared vs. feature-internal extraction

Two different problems look similar and are not: a pattern repeated across
features, and a single large file that would read better split up. Only the
first belongs in `components/shared/`.

- **The three-use rule.** A pattern becomes a new public component in
  `components/shared/` only once at least three production call sites need
  the same intent and layout responsibility — not merely a visual
  resemblance. Two similar-looking uses stay local until a third confirms the
  shared intent, unless the code is a necessary subcomponent of an
  abstraction that already cleared the threshold (e.g. a row renderer that
  only exists inside an already-shared list component).
- **Feature-internal decomposition is not shared extraction.** A large file
  with several focused responsibilities but no equivalent use elsewhere (the
  documentation sidebar's navigation tree) gets split into feature-owned files
  under its semantic slice, such as `features/docs/sidebar/components/`, and
  imported through
  `@/` — never moved
  into application `components/shared/`. Code used by two slices of one domain
  belongs in `features/<domain>/shared`; these internal components don't gain
  generic props, configuration options or public stories to "future-proof"
  them and stay shaped for their actual callers.
- **A shared component owns the structure it promises.** Once something is
  shared, callers pass typed data and behavior, not structural JSX that
  reimplements what the component already owns (e.g. authoring a second
  `<dd>` inside a `MetadataCell`, or hand-building `ul`/`li` markup a list
  component already emits). If a shared component needs a genuinely custom
  leaf — a rich value, a one-off control — it takes a narrow typed render
  callback for that leaf only, never an unrestricted `children` escape hatch
  that lets a caller rebuild the owned layout.
- **Compatibility during migration.** When a shared replacement lands for an
  existing hand-built pattern, the old projection/children mode can stay
  available until every consumer has moved. Delete it only after a static
  search (`rg`) confirms no remaining caller — don't carry two valid ways to
  build the same kind of page indefinitely.

### Feature organization

Feature roots describe product use cases, not implementation layers. For
example, the docs domain contains `home/`, `page/`, `sidebar/` and `shared/`; each
use-case slice owns any `components/`, `definitions/`, `hooks/` or `model/`
folders it actually needs. Route islands use the `*-page.tsx` suffix and Astro
routes import them through narrow slice or domain `index.ts` entry points.
Cross-slice imports use the target slice's public API, while files within the
same slice import direct internal paths to avoid barrel cycles. Runtime React
providers live under `src/providers/` and wrap the island/page boundary rather
than being embedded in `PageShell` or another visual component.

### Resource Composition APIs

The declarative layer that every list/detail overview page is built from —
descriptors and typed slots, not hand-built page structure. A migrated page
supplies data, callbacks and descriptors; these components own layout,
spacing, and the loading/error/empty cascade.

- **App Surfaces (`lib/app-surfaces.ts`).** The single registry of page
  identity: one `AppSurface` per `SurfaceId` (`id`, `path`, `title`, `label`,
  `description`, `icon`, optional `subItems`/`adminOnly`/`nav`). Every page's
  `<title>`, every `PageHero`'s icon/title/description, every nav entry
  (navbar, sidebar, section overview), every `SurfaceCard` and every static
  result of the ⌘K surface search read from this one place — `site-nav.ts` is derived from it, not a second source of truth.
  Adding a page means adding one entry here, never hardcoding a label/icon/
  description at the call site.
- **Resource Overview (`ResourceOverview`).** The outer stack for a list/
  overview page: `PageShell` + registry-driven `PageHero` (via `surface`) +
  optional `filters` slot + the query loading/error/empty/filtered-empty
  cascade (`QueryState` underneath). Named slots only (`heroMeta`,
  `heroStatus`, `heroAction`, `heroChildren`, `filters`) — `children` is
  strictly the query-success renderer, never a place to rebuild the shell.
- **Data Table (`DataTableView` + `useDataTable` + column definitions).**
  The row-rendering contract for every resource list: admin users,
  sessions, logs, API keys, plugins, organizations (and their member,
  invitation, role and team sections) and teams. A page supplies TanStack Table column definitions (identity and
  status cells come from `DataTableIdentityCell` / `DataTableStatusCell`,
  row actions from `RowActionsMenu`), and the view owns the scroll box,
  sticky header, sorting, resizing, reordering, column visibility (saved
  per table), header filters, row states (`muted`, `disabled`), expandable
  detail rows, day-group rows and the stacked layout below `@4xl/table`.
  Sort and filter state lives in the URL. `EntityList` and `SoftCardList`
  are superseded and have no production caller left; don't build new lists
  on them.
- **Resource Filters (`ResourceFilters` + `ResourceFilterDescriptor`).** The
  `CollapsibleFilters` panel driven by typed descriptors instead of
  hand-wired controls: `kind: "search" | "suggestion" | "select" | "date" |
  "facet" | "custom"`. `"facet"` is a multi-value include/exclude filter
  over a known option set, edited through a popover on `md+` and as a
  confirm-to-apply draft in the mobile sheet. `"suggestion"` pairs a text input with fold-text-matched
  suggestions (`lib/fold-text.ts`'s `textSuggestions`) for small in-memory
  collections; `"custom"` escapes to a caller-rendered control (e.g. an
  `EntityPicker`-based filter) when no built-in kind fits. The caller always
  owns filter state and passes `activeCount`/`onClear` — the panel itself
  holds no state. The same descriptors drive both layouts: at `md+` they
  render inside `CollapsibleFilters` and apply live; below `md` they render
  in `ListActionBar` + `FilterSheet` (see below). A page never builds the two
  layouts by hand.
- **Dialog Fields (`DialogFields` + `DialogFieldDescriptor` +
  `useDialogForm`).** The declarative counterpart to `FormField`/`FieldLabel`
  for `FormDialog` bodies: `kind: "text" | "email" | "password" | "textarea"
  | "select" | "checkbox"`, each bound to a `useDialogForm` instance so value/
  onChange/error/`aria-invalid` are never wired by hand. `useDialogForm`
  additionally exposes `errors`/`setError`/`clearErrors` for server-side
  validation replies. A dialog with genuinely one-off field behavior (a
  multi-step wizard, a live schedule preview) stays a hand-built `FormDialog`
  body — the descriptor API is for the common case, not a mandate.
- **Entity Picker (`EntityPicker`).** The single-select searchable picker
  built on a `useSearchSuggestions`-shaped hook (debounced server search) —
  the shared building block behind every "assign a user/org/team" control.
  Renders through `SearchSuggestionsList`; never a hand-rolled `Command`/
  `Popover` reimplementation of the same interaction.
- **Escape-hatch rules.** A few internal type-unsafe casts exist because
  TypeScript can't narrow a descriptor union's generic key back to its
  specific value type at the call site (`resolveIconRef`'s `IconRef`
  resolution, `dialog-fields.tsx`'s `asFieldValue`). These stay: (1) private
  to the component that needs them, never exported; (2) narrow — one cast at
  the exact point genericness defeats inference, not a broad `as any`; (3)
  commented with *why* the cast is safe. They are not a pattern to reach for
  elsewhere — a new one should be treated as a signal to reconsider the
  type design first.

### Page Shell

- **Shape:** rounded none — it's a frame, not a container. Vertical `min-h-main` flex child of the body.
- **Padding:** `px-4 py-6 sm:px-6` (page), `px-3 py-3 sm:px-6 sm:py-6` (compact for tables).
- **Max-width:** `80%` (`lg:max-w-[80%]`, full width below `lg`) is the default; `full` (`max-w-none`) for the admin pages, which fill the inset beside the admin sidebar (`AdminShell` pads them); `3xl` for `/me`; `4xl` and `6xl` are declared options with no current caller. Centred with `mx-auto`. Detail routes skip `PageShell` entirely (see `Detail.astro` below).
- **Wraps:** `QueryProvider` for TanStack Query. Pages with their own layout or that already sit inside another `<main>` skip it.

### Page Hero

- **Shape:** flat, no border. `gap-4` vertical, `gap-2.5` between icon and title.
- **Icon:** `size-5`, `text-primary`, **no** `rounded-lg bg-primary/15` box — the icon is the accent, not its backdrop.
- **Title:** the `display` role (18px semibold, tight). Single line, no eyebrow line above.
- **Description:** the muted `meta` role (13px, relaxed leading), max width by parent. Hero counters (`HeroCount`: `3 activos · 5 total`, each segment optionally with a small icon) use the same role with `tabular-nums` and the count itself in `text-foreground`.
- **Meta slot (right-aligned on `sm+`):** one primary `Button` + calm counter copy (`3 activos · 5 total`) or a tiny state dot + micro-caps label (`Activo` / `Deshabilitado`). Never badges.
- **Used everywhere:** the same `PageHero` renders the dynamic icon/title/description/status on both overview pages (inside `PageShell`) and detail pages (inside `Detail.astro`'s frame). There is no separate detail-only header component.

### Section Heading (`SectionHeading`)

The typographic heading one level below `PageHero`, for a section inside a page, sheet or dialog.

- **Shape:** a `Text` label (`h2` by default, `h3` inside an already-headed block) — no border, no icon, no badge.
- **Count:** optional `(n)` after the title in sentence-case `tabular-nums`, same muted tone, regular weight — typeset, never badged.
- **Action:** optional right-aligned control (one small `Button`), `justify-between` on the same row.
- **Used by:** organization detail sections (miembros, invitaciones, roles, equipos), and the team members sheet.

### Detail Layout (`Detail.astro`)

- **Shape:** an Astro layout, not a React component — it owns the `<main class="px-4 py-6 sm:px-6">` frame, centred at `lg:max-w-[80%]` by default (`maxWidth="80%"`, the same width as its overview) or `max-w-6xl` with `maxWidth="6xl"`, and a static, zero-JS back link so the mounted feature island only supplies the dynamic content via `PageHero`.
- **Back link:** `text-muted-foreground text-xs uppercase tracking-[0.08em]`, hover → `text-foreground`; `size-3` arrow icon, real `<a href>` (no client directive needed).
- **Island rule:** because `Detail.astro` already owns `<main>`/width/back-link, the mounted feature component wraps itself in a bare `QueryProvider`, never a second `PageShell`.

### Data Table (`DataTableView`)

Every record list in the product: a ruled table set in micro-caps, inside one quiet box.

- **Box:** one `rounded-xl border bg-card/40` scroll box per table that scrolls both ways, with the toolbar above it and the footer (infinite-scroll sentinel) inside it. Pages that sit under the window scroller cap it (`max-h-[70dvh]`) so the header stays visible. Never a stack of row cards.
- **Header:** `h-9 px-3`, `label` role in `muted-foreground`, sticky at the top of the box on `bg-background` with an inset 1px bottom rule. The sort control is the header text itself: unsorted columns show a faint `size-3` sort glyph at 50% opacity; the sorted column turns **ink** (`text-foreground`) with an asc/desc glyph — sorting is not an accent state.
- **Header filter:** a ghost `size-6` filter-glyph button beside the label, named by a `Hint` ("Filtrar …"). When the column is filtered it takes the accent tint (`bg-primary/10 text-primary`). Its `w-72` popover stacks sort options, a `SearchInput`, a checkbox list with mono details and tabular counts, and a hairline-separated "Quitar filtro".
- **Resize & reorder:** a 12px hit strip on each column edge draws a 1px `muted-foreground/40` divider at rest, thickening to 4px `bg-primary/70` on hover and solid primary while dragging or focused (←/→ resize by 16px, double-click resets). Dragging a header shows a 2px primary drop marker and fades the dragged column to 50%.
- **Columns menu:** an outline `h-9` "Columnas" button above the table (table layout only) opening a `w-72` checklist with drag handles; pinned columns read "Siempre visible"; a hairline-separated "Restablecer columnas" resets.
- **Rows:** cells `px-3 py-2.5`, hairline `border-b` between rows, `hover:bg-muted/50`, **no** `translate` or shadow. A `muted` row (an inactive record) drops to `text-muted-foreground`; a `disabled` row is `opacity-60` with no hover. Numbers right-align with `tabular-nums`.
- **Cells:** identity cells pair a `title`-role name with a muted `compact` sub-line; status cells are a `StatusDot` + label. Row actions live in a trailing column as a ghost kebab (`size-10 md:size-9`) at 60% opacity, rising to full on row hover or focus.
- **Expandable & grouped rows:** the expand toggle is a ghost chevron that rotates 180° when open, the detail row continues the cell grid (`px-3 pb-4`); group rows (`groupOf`, such as one per day) are `bg-muted/30` with a micro-caps heading.
- **Stacked layout (below `@4xl/table`):** the same data as a `divide-y` list of `px-4 py-4` items, each laid out as `MetadataCell` facts (`grid-cols-2 @md:3 @xl:4`), with `SortControls` and full-width outline filter buttons above (`border-primary/40 text-primary` while active).
- **Empty:** `FilteredEmpty` as `emptyMessage` — a centred muted `message` line plus an outline "Limpiar filtros" (`clearLabel`, with `FilterX`) calling `onClear`, hidden with `clearable={false}` when no filter is active. Loading belongs to `ResourceOverview` or a `StateCard`, never to skeleton rows.
- **Entrance:** `dash-enter` with a ~40ms `--dash-delay` step where rows animate; for long or paginated lists, drop the stagger rather than slow it down.

### Status Colors on Rows and Charts

The status vocabulary is a fixed mapping shared by `StatusDot` tones, table status cells and charts: **running** → `primary`, **success** → `foreground` (never green), **failed** → `destructive`, **paused / inactive** → `border`, **skipped** → `muted-foreground/40`.

### Chart (`components/ui/chart.tsx`)

- **Primitive:** TanStack Charts behind a themed wrapper; width follows the container, height is a fixed pixel value; type is the sans in `muted-foreground` with `tabular-nums`. Series colors come from the chart palette (see Colors → Scoped Palettes) and recolor live with the theme.
- **Tooltip:** the `Hint` look — inverted ink bubble, `rounded-md`, `0.375rem 0.75rem`, 12px sans — reachable by keyboard.

### Surface (`surfaceVariants`)

The quiet box every block sits in, as one recipe in `components/shared/brand/surface.ts` that Astro (`class:list`) and React (`className`) share: `rounded-xl border bg-card/40`, flat at rest. Layout (padding, flex, overflow) stays at the call site.

- **Static** (`surfaceVariants()`): the data table's scroll box, the content and git repository cards, `StateCard` (which adds `border-dashed`, and `border-solid` again for celebrate).
- **Interactive** (`surfaceVariants({ interactive: true })`): a box that is itself a link (`DocCard`, the documentation pager) or holds a stretched one (`SurfaceCard`). Hover or keyboard focus firm the border to `foreground/15` and fill `bg-muted/40` over 200ms; a focused link box also draws the `ring-[3px] ring-ring/50` focus ring. No lift, no shadow, no other hover fill.

### Surface Card (`SurfaceCard`/`SurfaceCardGrid`)

Registry-driven destination tile — the component behind a section overview's
per-subroute grid (`SectionNavOverview`, see `app-surfaces.ts` under Icon
System below). No screen renders one today: the home page's module grid was
replaced by the documentation reader. One component, two states:

- **Shape:** `rounded-xl border bg-card/40`, `p-4`, `gap-3`, no shadow; the whole tile is one stretched link with a `ring-[3px] ring-ring/50` focus ring.
- **Icon:** flat, `size-5 text-primary`, no backdrop box, beside the text column (`gap-2.5`).
- **Title:** the `title` role (14px medium, tight), single line, truncated.
- **Description:** the muted `compact` role at relaxed leading, ≤ 2 lines (`line-clamp-2`), always reserving two lines (`min-h-[3.25em]`) so the shortcuts' hairline lands at the same height across a row of tiles.
- **Leaf state** (a surface with no children, e.g. a section-overview card): a muted `size-4` chevron at the right of the title row that nudges `translate-x-0.5` and turns ink on hover.
- **Parent state** (a surface with children, e.g. `/admin`): instead of the chevron, a hairline-separated (`border-t pt-2.5`) two-column grid of child-surface shortcuts as filled `h-7 rounded-md bg-muted` pills (icon, label, `↗`), turning `bg-primary text-primary-foreground` on hover — a quick-access affordance for a section's own subroutes, not a plain link list.
- **Hover (whole tile):** the interactive surface — `bg-muted/40` and a slightly firmer border (`border-foreground/15`), no lift, no shadow; the same on keyboard focus of its stretched link.
- **Grid:** `SurfaceCardGrid` with container-query columns (see Layout), `gap-3`, each tile entering with `dash-enter`.

### State Card (`StateCard`)

- **Shape:** `rounded-xl border border-dashed bg-card/40 px-6 py-16` — placeholder, not container.
- **Icon:** flat (no box), `size-10`. Tones: `muted` (default), `destructive` (errors only), `celebrate` (success/solid border).
- **Title:** Headline role (muted/destructive), Display role (celebrate).
- **Description:** `text-muted-foreground text-sm leading-relaxed`, `max-w-sm mx-auto`.
- **Action slot:** one inline button. No toasts invented here.
- **Motion:** `dash-enter` on the container; `dash-pop` on nested icons.

### Status Dot / Status Tag (`StatusDot`, `StatusTag`)

The typographic replacement for a status badge.

- **Dot:** a `size-1.5` circle with five tones and nothing else — `primary` (alive/running), `border` (paused/inactive), `destructive` (failed), `foreground` (ok, never green), `muted` (`muted-foreground/40`, skipped). Optional `pulse` (`animate-pulse`) only for an in-flight action.
- **Tag:** the dot (optional) plus micro-caps text in the `status` role of `Text` (`text-xs uppercase tracking-[0.08em]`, muted), `gap-1.5`. Used in hero status slots, row status and sidebar items. A tag may omit the dot for a static label.
- **Rule:** if a state needs showing, it is a `StatusTag`. There is no filled or outlined status pill anywhere in the product.

### Hint (`Hint`)

The bubble that names an icon-only control, in place of the browser's native `title` tooltip.

- **Shape:** the `components/ui/tooltip.tsx` popup — `bg-foreground text-background`, `rounded-md`, `px-3 py-1.5 text-xs`, with a 6px arrow pointing at the control. It inverts against the page in both themes (ink bubble on paper, paper bubble on dark), so it reads as a floating layer without a shadow.
- **Timing:** opens after 300ms on hover or keyboard focus; a quick zoom-and-fade from the control's side. Never on touch.
- **Placement:** `top` by default; `bottom` for navbar/header actions; `left` for controls on the right edge.
- **Where:** icon-only row actions, kebab menus, compact comments toggles, copy, back-to-top, navbar actions and the sidebar toggle; also a status tag's explanation (e.g. a ban reason). Not on labelled buttons, obvious inline `×` clear buttons, buttons beside a text field being typed in, or touch-only controls.
- **Rule:** the control keeps its `aria-label`; the bubble is the visual name, not the accessible one.

### Active Filter Chips (`FilterChips`)

The one sanctioned chip in the system: a removable token that *is* the active filter, not decoration.

- **Placement:** a wrapping row above the list at every width, rendered only when something is active (`gap-2` between chips, `gap-x-3` to the trailing clear action).
- **Chip:** `h-7 rounded-md border`, `text-xs text-foreground`, label truncates; a `size-5` remove button with a `size-3` x icon in `muted-foreground` → `foreground` + `bg-muted` on hover. The visible button is small but its hit area is extended to 44px with an `after:-inset-3` overlay.
- **Exclude variant:** an excluded facet value shifts to `border-destructive/30 text-destructive` — the destructive ramp reads as "not this", with no new color invented.
- **Clear:** a ghost `sm` "Limpiar" button in `muted-foreground` at the end of the row.
- **Accessible name:** every remove button is labelled `Quitar filtro: <label>`.

### List Action Bar + Filter Sheet (`ListActionBar`, `FilterSheet`)

The narrow-viewport half of `ResourceFilters`. Hidden at `md+`.

- **Bar:** fixed to the bottom edge; see Layout for its surface, scroll behavior, safe-area padding and the `--list-action-bar-offset` contract. Holds one full-width outline "Filtros" button (`h-11`, filters icon, `Filtros · 3` when active — the count is typeset into the label, not badged) plus an optional sort control slot.
- **Sheet:** a bottom `Sheet` with `rounded-t-xl`, capped at `85dvh`, flat (`gap-0 p-0`). Header is a `border-b` row with the title and a ghost "Limpiar"; the body scrolls (`p-4`) with one labelled field per descriptor; the footer is `border-t bg-background` with safe-area bottom padding.
- **Confirm button:** full-width primary `h-11`, and its label is the result: `Ver 12 resultados` / `Ver 1 resultado` / `Sin resultados` / `Cargando…` while the draft total resolves. Facet edits are a draft until confirmed; other kinds apply live.

### Scroll-to-top (`ScrollToTopButton`)

- **Shape:** round (`rounded-full`) primary icon button, `size-11` on mobile, `size-9` on `md+`, `size-4` arrow icon. The system's only resting shadow (`shadow-lg`, see Elevation).
- **Placement:** mounted once per layout in a tight `position: fixed` root, `right: max(1rem, safe-area)` and `bottom: 1rem + safe-area + --list-action-bar-offset` on mobile, `1.5rem`/`1.5rem` on `md+`, `z-40`.
- **Opt-in:** only on pages whose scroller carries `data-scroll-to-top`, and only after 400px of scroll.
- **Motion:** 200ms fade + zoom-from-75% + slide-from-bottom on enter, the reverse on exit; the element unmounts after the exit finishes.
- **Label:** `aria-label` "Volver arriba", named visually by a `Hint` on its left side.

### Compact Pickers (`SegmentedPicker`, `NumberStepper`)

Dense, precise inputs for small finite values (currently the content repository form).

- **Segmented picker:** a `radiogroup` grid of `h-8 rounded-md border text-xs` cells, `gap-1`, column count set by the caller. Unselected cells are `border-input text-muted-foreground` with `hover:bg-muted/40 hover:text-foreground`; the selected cell **inverts to ink** (`bg-foreground text-background border-foreground`) — selection is expressed in monochrome, never with the accent. `mono` switches the labels to `font-mono tabular-nums`. An abbreviated cell (`L`, `M`…) carries its full name as `aria-label` and in a `Hint`.
- **Number stepper:** an `h-9 rounded-md border-input` dial: `w-8` chevron buttons in `muted-foreground` flanking a centered `font-mono text-sm tabular-nums` value, zero-padded to two digits. Values wrap at the bounds; arrows, PageUp/PageDown (±5), Home/End and the mouse wheel all step it. The chevrons are out of the tab order; the input carries focus.
- **Focus:** both use `focus-visible:ring-2 ring-ring/50`.

### Checklist Row (`CheckboxRow`)

One ticked option in a popover checklist (`components/shared/form/checkbox-row.tsx`): the data table's column filter and columns menu, and the column toggles of a documentation table.

- **Row:** `rounded-md`, `py-1.5 px-2` (`py-1 pr-1` when it carries a trailing control such as a drag grip), `hover:bg-muted/50`; a disabled row (a column that can't be hidden) keeps its place without the hover.
- **Label:** the whole label toggles the checkbox and is its accessible name. The name in the `body` role (`title` for a row that acts on the others, "Seleccionar todo"), then an optional `detail` in the muted `data` role (a value that tells options apart) or `note` in muted `compact` ("Siempre visible"), and an optional count in muted tabular `compact` at the right.
- **Rule:** a checklist row in a popover is a `CheckboxRow`, never a hand-built `li` + `Checkbox` + `label`. The facet filter's include/exclude rows (`ResourceFilters`, 44px touch rows with a second control) are a different control and stay their own.

### Form Dialog (`FormDialog`)

- **Frame:** `DialogContent` with `p-0`, `gap-0`, `sm:max-w-lg`, scrollable up to `calc(100vh - 2rem)`.
- **Header:** `border-b px-6 py-5`, `gap-1.5`, `DialogTitle tracking-tight`, `DialogDescription` in the `compact` role with relaxed leading.
- **Body:** `space-y-4 px-6 py-5` with `FormField` children. Long sections separated with `border-t`.
- **Footer:** `border-t px-6 py-4`, `Button variant="outline"` cancel + `Button` submit with optional pending spinner (`Loader2 size-4 animate-spin`).
- **Destructive submit:** `submitVariant="destructive"` on the footer button, no other color shift in the dialog.

### Form Field / Field Label (`FormField`, `FieldLabel`)

- **Label:** `FieldLabel` renders `<Text as="label" variant="label" tone="muted">`. This is the recurring micro-caps signature. Full-opacity `muted-foreground`, not `/80` — at this size the faded token fails 4.5:1.
- **Field:** `space-y-2` wrapper, optional hint as a muted `meta` `Text`.
- **Outside forms:** fact rows, filter labels and section titles use the same `label` role (`MetadataCell`, `SectionHeading`) — never shadcn `<Label>` at body size, never a hand-built class string.

### Collapsible Filters (`CollapsibleFilters` + `FilterField`)

- **Frame:** collapsed-by-default `Accordion` panel — a single "Filtros" trigger row (`min-h-11`) that expands into a control grid. One panel per list page; not a permanently-open filter row.
- **Trigger:** `SlidersHorizontal` icon (`size-4 text-muted-foreground`) + label + an active count in muted tabular text (`3 activos`) when `activeCount > 0` — typeset, never a `Badge`.
- **Body:** `FilterField` children (label + control) in a responsive grid (`columns` prop: 1–4, e.g. `grid-cols-1 sm:grid-cols-3`), plus an outline "Limpiar filtros" button with `FilterX` icon when a filter is active.
- **Count:** optional `text-xs text-muted-foreground` line below the panel.
- **Rule:** a list filters either from its **column headers** (the data table's header filters, as on users) or from this **panel** (filters that aren't a column, as on logs, teams and organizations) — never a hand-rolled flat filter row. Below `md` the same descriptors render as `ListActionBar` + `FilterSheet`; both halves come from `ResourceFilters`, never wired by hand. `FilterBar` (the old always-visible search+filters+count row) is superseded and no longer used anywhere in the codebase.

### Navigation (sidebar / navbar)

- **Navbar:** fixed, translucent (`bg-background/80 backdrop-blur`, `/60` where backdrop-filter is supported), height `--navbar-height: 3.6rem`. At rest the bottom hairline is faint (`border-border/40`); past a scroll threshold it firms up to `border-border` plus a hairline `shadow-sm` — the one navbar affordance allowed to leave "flat by default", used only as a scroll cue. The logo and app name sit on the left and the search, theme toggle and account menu on the right; there are no section links (admins reach `/admin` from "Administración" in the account menu).
- **Navbar actions (`NavbarAction`):** square icon buttons, `size-11` below `lg` and `size-9` from it, `rounded-lg border bg-background/60 text-muted-foreground`; hover or open firms the border to `primary/30` over `bg-accent`. Each carries a `Hint` below it.
- **Documentation sidebar (`DocsSidebar`):** a `w-64`/`lg:w-72` column on `bg-sidebar` with a right hairline, pinned below the navbar. At the top, a repository select ("Todos" plus each repository, only when there are two or more); then "Inicio" and the sections, whose title links and whose chevron folds them, with their pages and icons. Rows are shadcn `SidebarMenuButton`s whose hover and active fill use the neutral `--sidebar-accent` tokens; only the current page's icon turns Brand Terracotta. Below `md` it is a sheet opened from a menu button at the left of the navbar. No badge clusters. The admin sidebar (`features/admin/shell`) collapses to icons and ends with "Volver a la documentación".
- **Rich menu rows (`MenuItemText`):** dropdown items that pair an icon with a name and a short explanation render their text column through `MenuItemText` — a compact medium label (inherits the row color, so active rows turn `text-primary`) over a muted description clamped to two lines. The row itself owns padding, icon and hover/active styling.
- **Theme toggle:** circular `clip-path` reveal animation through the View Transitions API (see `hooks/use-theme-mode.ts`), never abrupt flicker; persisted chrome (navbar, sidebar) is excluded from page-navigation cross-fades.

### Surface Search (⌘K)

The navbar's jump-to-anything dialog.

- **Trigger:** from `lg`, a `h-9 w-52` field-shaped button (`rounded-lg border bg-background/60`, muted "Buscar…" + `Kbd` `⌘K` / `Ctrl K`), with the same hover as navbar actions; below `lg`, a `NavbarAction` with a search glyph.
- **Dialog:** a `sm:max-w-xl` command palette anchored near the top (`top-[12vh]`) so it doesn't jump while results filter. The input row is `h-14` with a `size-5` primary search glyph and an `esc` keycap as its close control.
- **Results:** each row leads with a `size-8 rounded-md bg-primary/10` icon tile holding a primary `size-4` glyph; on the selected row the tile **fills solid primary** with a white glyph and a `↵` keycap appears at the end. Labels show their section trail before the name, separated by muted `size-3` chevrons; the current page carries a primary `StatusDot`. Group headings are micro-caps `label` text pinned to the top of the list while scrolling. "Recientes" leads when the query is empty; record groups (documentation pages) appear only once there's a query.
- **Empty:** a centred search glyph, "Sin resultados para «…»" in the `title` role and a muted `meta` hint.
- **Footer legend:** from `sm`, a `border-t bg-muted/40` strip of keycaps — ↑↓ navegar, ↵ abrir, esc cerrar. Arrow navigation wraps from the first result to the last.

### Keycap (`Kbd`)

The one style for shortcut hints, never a hand-built `<kbd>`: `h-5 min-w-5 px-1.5`, hairline border on `bg-muted`, Space Mono at the 11px label size in medium `muted-foreground`. `KbdGroup` spaces several keys with `gap-1`.

### Logo (`AppLogo`)

Three rounded layers stacked in a stair: the two lower layers in ink (`fill-foreground`) so they follow the theme, the top layer in Brand Terracotta (`fill-primary`). Drawn inline so it themes live; 32px in the navbars (scales to 110% on hover), 24px in the admin sidebar, 26px on the auth cards inside a `size-12 rounded-xl bg-primary/15` tile — the one place an accent backdrop box is sanctioned, because it frames the brand mark, not a feature icon. The static footer uses `assets/logo.svg`, whose ink layer is set from `--logo-ink`.

### Icon Picker (`features/entity-icons/picker`)

Chooses a Lucide glyph for a user-owned entity (no entity type is registered yet). Opens as a `w-[22rem]` popover or, for roomier forms, a `sm:max-w-2xl` dialog. Category filters are `xs` secondary/ghost buttons; the grid is `aspect-square rounded-lg` cells in `text-foreground/80` (8 columns of `size-5` glyphs, or 10 columns of `size-6` in the dialog) and the selected cell takes `bg-muted` plus the icon color. When a screen allows color, swatches are `size-6` circles whose selection is an ink ring (`ring-2 ring-foreground/70 ring-offset-2`) — never an accent ring. The trigger is an outline icon button showing the current glyph.

### Buttons (shadcn `Button` over the token system)

- **Primary:** `background-color: var(--primary)`, `color: var(--primary-foreground)`, `border-radius: var(--radius)` (4–6px), uppercase only on `text-xs` tertiary actions, not on primary CTAs.
- **Outline:** hairline `border`, transparent background, `text-foreground`. Hover: `bg-muted/40`.
- **Ghost:** flat, hover: `bg-muted/40`.
- **Destructive:** the editorial ink ramp above.

### Inline Link (`inlineLinkClass`)

A link inside a line of product copy — "¿No tienes cuenta? Regístrate", "Consulta la API en /scalar", "Añade un repositorio en Administración · Contenido" — takes `inlineLinkClass` (`components/shared/brand/inline-link.ts`) on `AppLink`, `<a>` or an Astro `<a>`: `font-medium` ink over a `muted-foreground/40` underline at a 4px offset that firms to ink on hover or focus. It inherits the surrounding `Text` role; a path or URL adds the `data` role through `cn(inlineLinkClass, textVariants({ role: "data" }))`. It never turns Brand Terracotta: the accent stays for *here / act / alive*, and only links inside rendered Markdown are primary. Footer and navbar chrome keep their own link styles.

### Inputs / Fields (shadcn `Input`)

- **Style:** `h-8` (compact) / default height on form bodies, `border-color: var(--input)`, `border-radius: var(--radius)`.
- **Focus:** `ring-2 ring-ring ring-offset-2 ring-offset-background` (Brand Terracotta). Visible only on keyboard focus.
- **Error:** shifts `border-color` to `var(--destructive)`; no inline icon, no color icon box — message lives in `text-destructive text-xs` microcopy beneath the field.

### Code Blocks (`JsonView`)

Technical payloads are set in the `data` role inside a `rounded-lg border bg-muted/50 p-3` block at `text-foreground/90` with relaxed leading, wrapping long values rather than scrolling sideways. Tokens are colored by `@tanstack/highlight` from the syntax palette (see Colors → Scoped Palettes).

### Copyable URL (`CopyableUrl`, `features/admin/shared`)

A URL an admin pastes elsewhere (a git remote, the editor's catalog): the `data` role in a `rounded-md bg-muted` well, truncated to one line, with a ghost `CopyButton` ("URL copiada") at its end. Its label is a micro-caps `label` above the well (`stacked`, inside a card's facts) or inside it before the URL (`inline`, for a well standing alone on a page); a card whose context already names the URL omits it. A secret shown once (a new API key) is a different control: a read-only `Input`/`Textarea` with an outline copy button inside a `FormField`.

## Icon System

All icons are sourced from **Lucide React** (`lucide-react`). To ensure visual consistency across the entire application, every feature has a **single canonical icon** defined in a centralised registry.

### Icon Registry

The file `apps/frontend/src/lib/icon-registry.ts` is the single source of truth for all icons, grouped by semantic domain rather than a flat feature list: `navigation`, `auth`, `admin`, `entities`, `identity`, `security`, `actions`, `controls`, `status`, `views`, `communication`, `scheduling`, `theme`, `config`. Within a group, keys name the concept (`navigationIcons.docs`, `statusIcons.loading`), and the same Lucide icon can legitimately appear under two keys when it serves two concepts — the invariant is one canonical icon per *concept*, not one key per file.

### Usage

Always resolve through the two-argument helper — there is no flat `iconRegistry.<key>` shorthand:

```typescript
import { getIcon } from "@/lib/icon-registry"

const UsersIcon = getIcon("admin", "users")   // Type-safe, returns the Lucide component
const LoadingIcon = getIcon("status", "loading")
```

### Rules

**The One Icon Rule.** If users use the `Users` icon, that icon **must** appear in:

- The `/admin/users` page hero
- Navigation (the admin sidebar)
- Any breadcrumb, list row, or dialog that references users
- Admin or dashboard tiles that link to users

If an icon needs to change, update it in `icon-registry.ts` — all references propagate automatically.

**Lucide only.** Do not import custom SVG icons or use system icons. Every icon comes from Lucide. The two sanctioned exceptions: the brand mark (`AppLogo`), and the icon picker's own catalog (`features/entity-icons/picker`), which reads the full Lucide set because choosing among all glyphs is its job.

## Do's and Don'ts

### Do

- **Do** use `PageShell` (or `ResourceOverview`) to frame list/overview authenticated pages at its default 80% width; let it own padding and max-width. Detail routes use `Detail.astro` at the same width as their overview (bare `QueryProvider` + `PageHero`); auth keeps its own frame.
- **Do** keep the page header to one icon, one title, one description, and one primary action. Counters and statuses are typeset, not badged.
- **Do** express state as a dot (`bg-primary` / `bg-border` / `bg-destructive` / `bg-foreground`) plus a micro-caps label, never as a filled `Badge`.
- **Do** keep Brand Terracotta to *here / act / alive*: hero and tile icons, primary CTA and back-to-top, running dot, active navigation and active filters — full strength on glyphs and buttons, `bg-primary/10` tint on active rows.
- **Do** render record lists with `DataTableView` and column definitions: one `rounded-xl border bg-card/40` box, sticky micro-caps header, hairline rows, stacked layout below `@4xl/table`.
- **Do** size in-page grids and tables with container queries, not viewport breakpoints.
- **Do** use `FieldLabel` for form labels, `SectionHeading` for section titles and the `label` role of `Text` for every other micro-caps label; never hand-build the class string.
- **Do** set text through a `Text` role (or `textVariants` on a component's `className`); use the `data` role (Space Mono, `tabular-nums`) for cron expressions, durations, ISO timestamps, and IDs.
- **Do** name every icon-only control with a `Hint` bubble and keep its `aria-label`.
- **Do** animate list entrances with `dash-enter` and a `--dash-delay` step of ~40ms.
- **Do** reach for `FormDialog` + `FormField` for every create/edit dialog; let it own header/footer hairlines.
- **Do** filter a table from its column headers when the filter is a column; otherwise drive it through `ResourceFilters` descriptors (`CollapsibleFilters` at `md+`, `ListActionBar` + `FilterSheet` below). Never a hand-rolled always-open filter row.
- **Do** show active filters as `FilterChips` above the list, with a 44px hit area on every remove control.
- **Do** keep every fixed bottom element clear of `env(safe-area-inset-bottom)` and give its controls 44px touch targets.
- **Do** express selection in compact pickers by inverting to ink (`bg-foreground text-background`), and a sorted column by turning its header ink — not with the accent.
- **Do** show shortcut hints with `Kbd`.
- **Do** frame blocks with `surfaceVariants()`, and a box that is a link with `surfaceVariants({ interactive: true })`; never rebuild `rounded-xl border bg-card/40` or its hover by hand.
- **Do** set popover checklists with `CheckboxRow` and links inside product copy with `inlineLinkClass`.
- **Do** keep `DialogHeader` `border-b` and `DialogFooter` `border-t`; long bodies separated with `border-t`.
- **Do** reach for `AppLink` for internal routing; raw `<a>` is out.
- **Do** format dates through `@/lib/format`; never reinvent `formatDate`.
- **Do** import icons from `@/lib/icon-registry`; never import Lucide icons directly. One icon per feature, consistent everywhere.

### Don't

- **Don't** wrap an icon in `rounded-lg bg-primary/15 text-primary` on a row or tile; the flat accent is the accent.
- **Don't** invent semantic colors for success/info/warning; success is `bg-foreground` + word, failure is destructive, neutral state is `bg-border`.
- **Don't** use raw Tailwind palette colors (`text-amber-500`, `text-rose-500`, …) in product surfaces, and don't lift the chart, syntax or entity-icon palettes out of their scope.
- **Don't** render rows as free-floating cards with `shadow-md`, and don't build new lists on the superseded `EntityList` / `SoftCardList`.
- **Don't** count things with `Badge variant="outline"`; typeset `3 activos · 5 total` as text.
- **Don't** nest cards (`Card` inside `Card`, or `Card` around a facts grid); `border-y` + `<dl>` is enough.
- **Don't** use gradients, glow, or decorative `shadow-lg`/`shadow-xl` in product chrome. The floating back-to-top control carries the only sanctioned resting shadow.
- **Don't** build chip/pill clusters in the hero or on tiles; subaccess is a typographic list. The only chips in the product are removable active-filter chips.
- **Don't** add another `<main class="container…">` in the `.astro`; `PageShell` is the frame.
- **Don't** cap an overview or detail page at `6xl` by habit; the 80% default is the rhythm, narrower caps need a reason.
- **Don't** use `formatDate` / `formatDateTime` locals; the helper `@/lib/format` is the source of truth.
- **Don't** link internally with raw `<a>`; `AppLink` is the source of truth.
- **Don't** use generic `DialogContent` + `Label` for forms; reach for `FormDialog` + `FieldLabel`.
- **Don't** reach for `Badge`, `Button` chips, or primary-colored borders when type and dots would do.
- **Don't** rely on the browser's native `title` tooltip on a control; it carries no design. Use `Hint`.
- **Don't** hand-build initials tiles; `UserAvatar` owns the monochrome fill and initials.
- **Don't** import Lucide icons directly (`import { Clock } from "lucide-react"`); always go through `icon-registry`. If a feature's icon isn't registered, add it to the registry first.

### Exceptions (per PRODUCT.md)

The style applies to product surfaces (lists, detail, forms, settings). It does **not** apply to:

- `components/ui/**` (shadcn base — they remain the available primitives).
- `features/app-shell` chrome (navbar, sidebar, theme toggle) — small adjustments permitted.
- `/login`, `/signup` — may stay as form-card (`max-w-md` card with hairline header/footer) on the plain `background`; not a list/detail page.
