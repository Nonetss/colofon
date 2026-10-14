import { useCallback, useMemo, useState } from "react"
import {
  buildWaterfallTree,
  defaultExpandedKeys,
  expandableKeys,
  waterfallRows,
} from "@/features/admin/traces/detail/model/waterfall-tree"
import type { TraceSpan } from "@/features/admin/traces/shared"

/** What the user opened or folded, on top of what opens by default. */
type Overrides = ReadonlyMap<string, boolean>

/**
 * The waterfall's rows and what folds them: whether oRPC plumbing is shown,
 * and which spans and groups are open — the default outline
 * (`defaultExpandedKeys`) with the user's toggles on top, so spans still
 * arriving on a stream open by the same rule without undoing a toggle.
 */
/** Share of the scale under which two stretches of a folded row's bar paint
 *  as one: below what the bar can show apart anyway. */
const SEGMENT_GAP_SHARE = 0.002

export function useWaterfallTree(spans: readonly TraceSpan[], scaleMs: number) {
  const [showInternal, setShowInternal] = useState(false)
  const [overrides, setOverrides] = useState<Overrides>(() => new Map())

  const tree = useMemo(
    () => buildWaterfallTree(spans, { showInternal }),
    [spans, showInternal]
  )
  const defaults = useMemo(() => defaultExpandedKeys(tree), [tree])

  const isExpanded = useCallback(
    (key: string) => {
      const override = overrides.get(key)
      if (override === undefined) return defaults.has(key)
      return override
    },
    [overrides, defaults]
  )

  const rows = useMemo(
    () =>
      waterfallRows(tree, isExpanded, { gapMs: scaleMs * SEGMENT_GAP_SHARE }),
    [tree, isExpanded, scaleMs]
  )

  const toggle = useCallback(
    (key: string) => {
      setOverrides((current) => new Map(current).set(key, !isExpanded(key)))
    },
    [isExpanded]
  )

  const setAll = useCallback(
    (expanded: boolean) => {
      setOverrides(new Map(expandableKeys(tree).map((key) => [key, expanded])))
    },
    [tree]
  )

  return {
    rows,
    hiddenCount: tree.hiddenCount,
    showInternal,
    setShowInternal,
    toggle,
    expandAll: () => setAll(true),
    collapseAll: () => setAll(false),
  }
}
