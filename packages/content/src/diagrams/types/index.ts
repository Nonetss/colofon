import { architectureDelta } from "#diagrams/types/architecture-delta"
import { bar } from "#diagrams/types/bar"
import { dependency } from "#diagrams/types/dependency"
import { fishbone } from "#diagrams/types/fishbone"
import { flowchart } from "#diagrams/types/flowchart"
import { gantt } from "#diagrams/types/gantt"
import { heatmap } from "#diagrams/types/heatmap"
import { journey } from "#diagrams/types/journey"
import { kanban } from "#diagrams/types/kanban"
import type { TypeModule } from "#diagrams/types/kit/scene"
import { layers } from "#diagrams/types/layers"
import { line } from "#diagrams/types/line"
import { loop } from "#diagrams/types/loop"
import { matrix } from "#diagrams/types/matrix"
import { polar } from "#diagrams/types/polar"
import { pyramid } from "#diagrams/types/pyramid"
import { quadrant } from "#diagrams/types/quadrant"
import { radar } from "#diagrams/types/radar"
import { sankey } from "#diagrams/types/sankey"
import { scatter } from "#diagrams/types/scatter"
import { sequence } from "#diagrams/types/sequence"
import { state } from "#diagrams/types/state"
import { storyMap } from "#diagrams/types/story-map"
import { swimlane } from "#diagrams/types/swimlane"
import { timeline } from "#diagrams/types/timeline"
import { orgChart, tree } from "#diagrams/types/tree"
import { treemap } from "#diagrams/types/treemap"
import { venn } from "#diagrams/types/venn"
import { wardley } from "#diagrams/types/wardley"
import { waterfall } from "#diagrams/types/waterfall"

// The typed diagram forms (`content-diagram-types`), ported from the layout
// grammars of diagram-design (https://github.com/cathrynlavery/diagram-design,
// MIT, © Cathryn Lavery) onto the platform's theme. A diagram file with
// `type` is read by the form of that name; a type not listed here is
// reported as unknown.

export const DIAGRAM_TYPES: readonly TypeModule[] = [
  // Graphs: flowchart, state machine, tree, org chart, dependency graph.
  flowchart,
  state,
  tree,
  orgChart,
  dependency,
  // Flows and time: sequence, timeline, Gantt, swimlane, kanban, story map,
  // user journey.
  sequence,
  timeline,
  gantt,
  swimlane,
  kanban,
  storyMap,
  journey,
  // Concepts: quadrant, Wardley map, Venn, pyramid, layers, loop, fishbone,
  // matrix.
  quadrant,
  wardley,
  venn,
  pyramid,
  layers,
  loop,
  fishbone,
  matrix,
  // Charts: bars, waterfall, lines and dots, then areas, grids and flows.
  bar,
  waterfall,
  line,
  scatter,
  heatmap,
  treemap,
  radar,
  polar,
  sankey,
  // Before and after.
  architectureDelta,
]

/** The form named `name`, if there is one. */
export function typeModule(name: string): TypeModule | undefined {
  return DIAGRAM_TYPES.find((module) => module.name === name)
}

/** Every `type` value, in the registry's order. */
export function typeNames(): string[] {
  return DIAGRAM_TYPES.map((module) => module.name)
}
