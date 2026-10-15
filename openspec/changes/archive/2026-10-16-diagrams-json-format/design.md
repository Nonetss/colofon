## Context

Today `packages/content` reads `diagramas/*.yaml` (`src/pages/diagrams.ts`), lays each diagram out with ELK (`diagram-layout.ts`, `elkjs`) and draws it as hast (`diagram-svg.ts`) that goes through the page sanitizer (`to-hast.ts`, `DIAGRAM_SVG_ATTRIBUTES`, classes `doc-diagram-*`). The frontend styles it in `global.css` and opens a copy in `doc-lightbox.tsx`. There is no hover behaviour.

The reference is `doc-sjd/site/esquemas/lib.mjs` (spec → SVG string with an inline `<style>`, `<marker>` ids and `<title>` tooltips) and `doc-sjd/site/src/lib/esquemas.ts` (document-level listeners: lighting, the card, trace, needs, touch). Content here is never executed (`content-pages`), so the `.mjs` helpers (`chain`, `fit`, small factory functions) cannot travel: JSON carries the resolved data, and `chain` becomes a declared form. See proposal.md for motivation and the delta specs for the format.

## Goals / Non-Goals

**Goals:**
- A `lib.mjs` spec, with its helper calls resolved, pastes into `diagramas/<id>.json` with no renaming beyond `slug` (the file name) and `href` (→ `entity`/`page`).
- Same look as `lib.mjs` and same interaction as `esquemas.ts`, inside the reader's sanitized, theme-following render.

**Non-Goals:**
- Automatic layout, or keeping ELK as a fallback.
- Converting doc-sjd's 60 schemes or the `documentacion` repository in this change (they are content; only the two guide diagrams are needed to keep `documentacion` valid, and that repo is edited separately).
- Icons inside boxes, raw `href` links, user-written CSS.

## Decisions

### Strict JSON parsed with positions

Use `jsonc-parser` (already in the tree transitively; add it to `packages/content` through the root catalog) with comments and trailing commas disallowed: it reports an offset per syntax error, which becomes the line and column the spec asks for. `JSON.parse` in Bun gives no position; parsing JSON with the `yaml` package would silently accept YAML.

### Validation with zod, reported by field path

One zod schema per form (`drawn`, `chain`) in `diagrams.ts`, union on the presence of `items`, exported through `diagramSchemas(entityKeys, pagePaths)` so `editor-schemas.ts` turns the same schema into JSON Schema (`$schema` allowed, `entity`/`page` as enums when given). Cross-references (ids unique, `from`/`to`/`zone`/`toZone`/`needs` existing, `entity` in the catalog, `page` among the page paths, right-angle segments, `label` ⇒ `at`, badge ⇒ no `points` and both ends) are checked after parsing, each reported with `describeIssue`'s dotted path (`nodes.3.entity`) and the faulty part dropped or downgraded as the spec says. Paths use list indexes because boxes are a list, as in `lib.mjs`.

### Measuring text the `lib.mjs` way

Port `textWidth` (advance 0.62 mono, 0.58 sans, plus tracking), `fit` and `tableHeight` into a small `diagram-measure.ts`; the fit warnings become problems. `chain` uses `fit` to size and place its items, reproducing `lib.mjs`'s `chain()` (gaps of at least 48, wider for long labels; drawing width = last x + 24, height = y + h + 24). `diagram-layout.ts` and `elkjs` are removed.

### Drawing: same geometry, platform classes, no ids

Rewrite `diagram-svg.ts` as a port of `diagram()`/`plainNode`/`tableNode`/`badges`/`outline`/`roundedPath`/`label` and the legend, producing hast instead of strings, with these translations so it survives the sanitizer and several diagrams per page:
- `d-*` classes → `doc-diagram-*` (`doc-diagram-focal`, `doc-diagram-hued`, `doc-diagram-hue-teal`…), still matched by `DIAGRAM_CLASS`; the inline `<style>` moves to `global.css`.
- `<marker>`s need ids, which the sanitizer refuses and which would collide across diagrams: arrowheads stay their own small `path`s at the last segment's end (as today), classed by kind and hue.
- `<title>` tooltips → `data-info`; the interaction module shows it in the card. The figure's text version keeps the content readable without JavaScript.
- Links: `a` with the resolved reader route (entity page, generated catalog page, or page path), as today.

`to-hast.ts` widens `DIAGRAM_SVG_ATTRIBUTES` with exactly the attributes the drawing emits: `dataNode`, `dataZone`, `dataTrace`, `dataNeeds`, `dataEdge`, `dataFrom`, `dataTo`, `dataToZone`, `dataLabel`, `dataInfo`, `textAnchor` `end`, `strokeDasharray` is not needed (CSS does it). Values are content text and only land in attribute values or text nodes.

Alternatives: emitting `lib.mjs`'s SVG string and inlining it raw (would bypass the sanitizer and need per-diagram id prefixes); keeping ELK for positions with the new look (rejected by the user).

### Colours in the reader's stylesheet

Port `STYLE`, `HUE_STYLE` and `BADGE_STYLE` into `global.css` under the existing diagram block, with doc-sjd's `--d-*` token mapping (`--d-paper: var(--card)`, `--d-accent: var(--primary)`, `color-mix` tints, the ten `--d-hue-*` light values and their dark overrides, `--d-down`), scoped to `.doc-diagram-svg` so the lightbox copy (`.doc-lightbox-drawing`) gets them too. The focus/fade/`d-down` rules and the `.diagram-tip` card styles come along, renamed to `doc-diagram-*`.

### Interaction as a page script

Port `esquemas.ts` to `apps/frontend/src/features/docs/page/model/diagram-highlights.ts`, set up once from `page-scripts.ts` (document listeners survive router swaps; the card is appended to the open `dialog` when inside the lightbox). Split it in two:
- a pure graph module (`diagram-graph.ts`): edges as `{ id, from, to, toZone, label, info, accent }`, `touches`, `farEnds`, `fallsWith`, `traceFrom`, and the card lists — unit-tested in `apps/frontend/tests/unit/`;
- the DOM layer: reading `data-*` into that model, toggling `doc-diagram-on`/`-down`/`-focus`, positioning the card, pointer/focus/touch/Escape handling.
It is rewritten to the repo's code style (no `as` casts: `instanceof Element` guards; no nested ternaries). The card's copy stays in Spanish ("Conexiones", "Depende de", "Si se cae, afecta a", "Camino principal", "N piezas"). The lightbox's "press on a node link does not open" rule is kept; on touch, the first tap is consumed by the highlight before the lightbox sees it.

### Text version and catalog pages

`diagramFigure` keeps its caption + zones + connections structure, built from boxes' `zone` and from edges/badges with `from` and `to`/`toZone`. `diagramsByEntity` reads boxes' `entity`. `llm.txt` is unchanged in shape.

## Risks / Trade-offs

- [Hand-placed coordinates are tedious and break when a box grows] → fit problems are reported per box, and `chain` covers the simple row case; doc-sjd's schemes already carry tuned coordinates.
- [Average glyph widths misjudge some strings] → same heuristic as `lib.mjs`, so a scheme that fitted there fits here; problems do not block rendering.
- [Breaking the contract for existing content] → `.yaml` diagrams are reported with the new name rather than silently ignored; only `documentacion` has diagrams today.
- [More `data-*` attributes through the sanitizer] → whitelisted per element, values never interpreted as markup; no `style`, `id` or event attributes are added.
- [Document-level listeners on every page] → they bail out unless the target is inside `.doc-diagram-svg`.

## Migration Plan

1. Land the new reader, drawing, interaction and schema together (the old YAML diagrams then show a notice and a reported problem).
2. Rewrite `documentacion/diagramas/pipeline.yaml` and `repository.yaml` as JSON with coordinates, and update its pages, `catalogo/files/diagram-file.yaml` and skill references that describe the format; update `docs/human/contenido.md` here.
3. Move doc-sjd's schemes over when wanted (resolve helper calls, `href` → `entity`/`page`).
Rollback is reverting the change; no stored data depends on the format.
