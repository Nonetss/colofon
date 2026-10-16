import { dependency } from "#pages/diagram-types/dependency"
import { flowchart } from "#pages/diagram-types/flowchart"
import type { TypeModule } from "#pages/diagram-types/scene"
import { state } from "#pages/diagram-types/state"
import { orgChart, tree } from "#pages/diagram-types/tree"

// The typed forms of this family: flowchart, state machine, tree, org chart
// and dependency graph.

export const GRAPH_TYPES: TypeModule[] = [
  flowchart,
  state,
  tree,
  orgChart,
  dependency,
]
