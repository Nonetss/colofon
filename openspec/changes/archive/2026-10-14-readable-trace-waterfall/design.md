## Context

`traces.get` already returns spans depth-first with `parentSpanId` and `depth`, capped at 2000. The panel rendered that list verbatim. Most of a large trace's rows are oRPC plumbing repeated per call and per-row SQL statements.

## Goals / Non-Goals

**Goals:** a trace of any size opens on a short, readable outline; repeated work reads as one row with its count and cost; errors are never hidden.

**Non-Goals:** changing `traces.get`'s shape or cap; grouping on the server; virtualizing the list (folded, the rows on screen stay few; an opened group of hundreds is still a plain list in a scroll box).

## Decisions

1. **Everything in the frontend, as a pure model.** `waterfall-tree.ts` builds a tree from the spans (hidden spans hand their children to the nearest kept ancestor; a span whose parent is missing is a root), folds sibling runs into groups, computes the default open set and flattens it into rows. The hook only holds `showInternal` and the user's toggles. Keeps the API contract and makes the rules unit-testable.
2. **Hidden by name, never when failing.** oRPC's span names are fixed by `@orpc/otel` (`call_procedure`, `middleware.<name>`, `validate_input`, `validate_output`, `handler`, `consume_*`). Matching by name is enough; a span in error status is always kept so its error is visible.
3. **Groups by consecutive name and service, minimum 3.** Two of a kind read fine as two rows. Group key is derived from its first span id, stable while a stream adds spans after it.
4. **Default outline by row budget (60), breadth-first.** Opening by fixed depth would either show nothing for deep traces or everything for wide ones. Breadth-first with a budget opens the trace's shape (the procedures it ran and what each did) and leaves big subtrees folded. Groups start folded. Spans in error are revealed with every enclosing span and group.
5. **User toggles override the defaults per key.** The default set is recomputed when spans arrive on a stream; a toggle keeps its state. "Desplegar/Plegar todo" set an override for every expandable key.
6. **Folded rows paint what they hide.** Folding the tree would leave mostly Backend rows on screen, losing the per-service colors that tell where the time went. A folded span paints, over its own bar, its descendants' bars of other services (and errors), merged per service when closer than 0.2% of the scale so hundreds of queries become a few segments; a group paints its members the same way, at full color.

## Risks / Trade-offs

- A span another library names `handler` would be hidden too → the switch shows it, and an erroring one is never hidden.
