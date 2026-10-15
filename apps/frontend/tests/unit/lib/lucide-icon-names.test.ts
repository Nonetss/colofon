import { describe, expect, test } from "bun:test"
import { LUCIDE_ICON_NAMES } from "@nonete/content"
import { iconNames } from "lucide-react/dynamic"

// packages/content validates every `icono` of a content repository against
// a list generated from the installed lucide-react. Upgrading lucide-react
// without `bun run icons:catalog` would accept names the reader can't draw.

describe("Lucide icon names of packages/content", () => {
  test("match the names the installed lucide-react draws", () => {
    expect([...LUCIDE_ICON_NAMES]).toEqual([...iconNames].sort())
  })
})
