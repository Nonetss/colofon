import { CHART_TYPES } from "#pages/diagram-types/chart"
import { CHART_MORE_TYPES } from "#pages/diagram-types/chart-more"
import { CONCEPT_TYPES } from "#pages/diagram-types/concept"
import { DELTA_TYPES } from "#pages/diagram-types/delta"
import { FLOW_TYPES } from "#pages/diagram-types/flow"
import { GRAPH_TYPES } from "#pages/diagram-types/graph"
import type { TypeModule } from "#pages/diagram-types/scene"

// The typed diagram forms (`content-diagram-types`), ported from the layout
// grammars of diagram-design (https://github.com/cathrynlavery/diagram-design,
// MIT, © Cathryn Lavery) onto the platform's theme. A diagram file with
// `type` is read by the form of that name; a type not listed here is
// reported as unknown.

export const DIAGRAM_TYPES: readonly TypeModule[] = [
  ...GRAPH_TYPES,
  ...FLOW_TYPES,
  ...CONCEPT_TYPES,
  ...CHART_TYPES,
  ...CHART_MORE_TYPES,
  ...DELTA_TYPES,
]

/** The form named `name`, if there is one. */
export function typeModule(name: string): TypeModule | undefined {
  return DIAGRAM_TYPES.find((module) => module.name === name)
}

/** Every `type` value, in the registry's order. */
export function typeNames(): string[] {
  return DIAGRAM_TYPES.map((module) => module.name)
}
