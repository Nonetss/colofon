## Why

A trace that runs many procedures or queries easily carries hundreds or thousands of spans: each oRPC call repeats oRPC's own spans (`call_procedure`, `middleware.*`, `validate_input`/`validate_output`, `handler`, `consume_*`), and work that writes row by row leaves one `pg.query` span per row. The waterfall draws one row per span, so the panel turns into an endless list that hits the 2000-span cap and pushes the selected span's attributes out of reach.

## What Changes

- The waterfall hides oRPC's per-call spans by default, lifting their children to the nearest span it shows; a switch shows them, and one in error is always shown.
- Runs of three or more consecutive siblings with the same name and service fold into one row with their count, the sum of their durations and a bar from the first one's start to the last one's end; the row opens to list them.
- Spans with children fold behind a chevron. By default the waterfall opens the roots and then level by level only while the outline stays within a row budget, plus every span and group enclosing a span in error. "Desplegar todo" and "Plegar todo" open or fold everything.
- A folded span or row paints, on its bar and in each service's color, where the services it hides ran, so the outline keeps the colors that tell where the time went.
- The waterfall scrolls in its own box, so the selected span's attributes stay below it.

## Capabilities

### New Capabilities

### Modified Capabilities

- `trace-viewer`: the waterfall panel no longer shows one row per span; it hides oRPC plumbing, folds repeated siblings and opens as an outline.

## Impact

- `apps/frontend/src/features/admin/traces/detail/` (`model/waterfall-tree.ts`, `hooks/use-waterfall-tree.ts`, `components/trace-waterfall.tsx`), with a unit test under `apps/frontend/tests/unit/features/admin/traces/`. No API, schema or migration change.
- `docs/human/transversales.md` and the `stack` skill's `references/writing-unit-tests.md` (test location for a feature `model/` module).
