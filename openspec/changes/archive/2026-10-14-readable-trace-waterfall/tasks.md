## 1. Waterfall

- [x] 1.1 Add `apps/frontend/src/features/admin/traces/detail/model/waterfall-tree.ts` (design Decisions 1–4 and 6) with its test in `apps/frontend/tests/unit/features/admin/traces/waterfall-tree.test.ts`: plumbing hidden and its children lifted, errors kept, runs folded with count/total/extent, open groups one level deeper, the default outline and error reveal.
- [x] 1.2 Add `hooks/use-waterfall-tree.ts` (Decision 5) and render folding rows, groups, the internal-spans switch, "Desplegar todo"/"Plegar todo" and the scroll box in `components/trace-waterfall.tsx`, after `bun run ui:pick` / `bun run hook:pick`.

## 2. Docs

- [x] 2.1 Describe the waterfall in `docs/human/transversales.md` and add the feature `model/` test location to the `stack` skill's `references/writing-unit-tests.md`.

## 3. Validation

- [x] 3.1 Run `check-types`, Biome and `bun run test` in `apps/frontend`.
