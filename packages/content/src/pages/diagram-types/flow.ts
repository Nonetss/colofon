import { gantt } from "#pages/diagram-types/gantt"
import { journey } from "#pages/diagram-types/journey"
import { kanban } from "#pages/diagram-types/kanban"
import type { TypeModule } from "#pages/diagram-types/scene"
import { sequence } from "#pages/diagram-types/sequence"
import { storyMap } from "#pages/diagram-types/story-map"
import { swimlane } from "#pages/diagram-types/swimlane"
import { timeline } from "#pages/diagram-types/timeline"

// The typed forms of this family: sequence, timeline, Gantt, swimlane,
// kanban, story map and user journey.

export const FLOW_TYPES: TypeModule[] = [
  sequence,
  timeline,
  gantt,
  swimlane,
  kanban,
  storyMap,
  journey,
]
