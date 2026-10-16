import { bar } from "#pages/diagram-types/bar"
import { line } from "#pages/diagram-types/line"
import { scatter } from "#pages/diagram-types/scatter"
import type { TypeModule } from "#pages/diagram-types/scene"
import { waterfall } from "#pages/diagram-types/waterfall"

// The typed forms of this family: bar, waterfall, line and scatter
// (`chart-more.ts` holds the rest).

export const CHART_TYPES: TypeModule[] = [bar, waterfall, line, scatter]
