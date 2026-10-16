import { heatmap } from "#pages/diagram-types/heatmap"
import { polar } from "#pages/diagram-types/polar"
import { radar } from "#pages/diagram-types/radar"
import { sankey } from "#pages/diagram-types/sankey"
import type { TypeModule } from "#pages/diagram-types/scene"
import { treemap } from "#pages/diagram-types/treemap"

// The typed forms of the chart family that read areas, grids and flows:
// heatmap, treemap, radar, polar and Sankey.

export const CHART_MORE_TYPES: TypeModule[] = [
  heatmap,
  treemap,
  radar,
  polar,
  sankey,
]
