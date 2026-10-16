import { fishbone } from "#pages/diagram-types/fishbone"
import { layers } from "#pages/diagram-types/layers"
import { loop } from "#pages/diagram-types/loop"
import { matrix } from "#pages/diagram-types/matrix"
import { pyramid } from "#pages/diagram-types/pyramid"
import { quadrant } from "#pages/diagram-types/quadrant"
import type { TypeModule } from "#pages/diagram-types/scene"
import { venn } from "#pages/diagram-types/venn"
import { wardley } from "#pages/diagram-types/wardley"

// The typed forms of this family: quadrant, Wardley map, Venn, pyramid,
// layers, loop, fishbone and matrix.

export const CONCEPT_TYPES: TypeModule[] = [
  quadrant,
  wardley,
  venn,
  pyramid,
  layers,
  loop,
  fishbone,
  matrix,
]
