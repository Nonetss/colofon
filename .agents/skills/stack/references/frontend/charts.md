# Charts (`Chart`, TanStack Charts)

Every chart in `apps/frontend` is a [TanStack Charts](https://tanstack.com/charts/latest/docs) definition rendered through `Chart` (`apps/frontend/src/components/ui/chart.tsx`). The shadcn `chart` component and Recharts are not installed and don't get added, and a feature never draws chart marks by hand (styled `div`/`span` bars, ad-hoc `<svg>`). There is no production consumer right now (the cron detail page's pulse strip, the first one, left with `/crons`); the wrapper stays for the next chart.

```tsx
import { barY, defineChart } from "@tanstack/charts"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { tooltip } from "@tanstack/charts/tooltip"
import { Chart } from "@/components/ui/chart"

const definition = useMemo(
  () =>
    defineChart({
      marks: [barY(rows, { x: "channel", y: "visits", color: "channel" })],
      scales: {
        x: { scale: scaleBand },
        y: { scale: scaleLinear, nice: true, grid: true },
      },
      tooltip: { use: tooltip },
    }),
  [rows]
)

return <Chart definition={definition} ariaLabel="Visitas por canal" height={260} />
```

## Rules

- **`Chart` from `@/components/ui/chart`, never `@tanstack/charts/react` directly.** The wrapper puts the chart in the app's theme and fixes the sizing policy; features import marks, scales and extensions from `@tanstack/charts` themselves (there is no re-export layer).
- **`ariaLabel` is a sentence that summarizes the data** in Spanish ("48 ejecuciones, 45 correctas, 2 fallidas, 1 omitida"), not the chart's title. Keyboard focus and the announced tooltip come with the library; don't turn them off.
- **Width follows the container, height is a number.** Islands mount with `client:only="react"`, so there's no server render and no `initialWidth`/`width`/`aspectRatio`; the wrapper's props only accept `height`. Inside a flex or grid child the wrapper already sets `min-w-0`.
- **Colors.** Unordered categories use the `color` channel, which takes the palette in order (`--ts-chart-1..6` → `--chart-1..6`, bridged on `.ts-chart-host` in `src/styles/app/charts.css`). A mark that encodes meaning (a run status, an error) sets `fill`/`stroke` to the same token the rest of the UI uses for that state, as a `var(--token)` or `color-mix()` string (`var(--destructive)`, `var(--primary)`); never a hex value and never a palette slot. Axis text and gridlines inherit the muted text color, so there's no `theme` object in definitions: switching `.dark` recolors live charts.
- **Tooltips.** Add `tooltip: { use: tooltip }`; its chrome already matches `TooltipContent`. Set the text in the definition with `format` (one plain line) or `items` (labeled rows), in Spanish and with the `src/lib/format` helpers. Reach for `renderTooltipBody` (`@tanstack/charts/react/tooltip`) only when the tooltip needs React content, and extend the wrapper to forward it then.
- **Definitions are memoized** with `useMemo` on the data they capture (or live at module scope when static); a new definition identity rebuilds the scene. Keep data shaping in the slice's `model/` and the definition next to the component.
- **Imports are exact subpaths**: `@tanstack/charts`, `@tanstack/charts/scales/<linear|band|point|ordinal>`, `@tanstack/charts/tooltip`, `@tanstack/charts/legend`. Upgrade a single scale to `d3-scale` only for temporal or nonlinear domains. Never import the Canvas, `/react/core` or other framework entries without a measured reason.
- **Placement.** A chart belongs to the slice that shows it (`features/<domain>/<slice>/components/`); a reusable chart type moves to `components/shared` after three consumers, like any other pattern.
- **Legends** can stay in HTML next to the chart when they also act as a key for other content (the pulse's legend); use a swatch painted with the same token string as the mark.

## Writing a new chart

The library ships its own docs and agent skills in the installed package. Read them there instead of guessing the API:

- `apps/frontend/node_modules/@tanstack/charts/docs/` — guides (`guides/choosing-a-chart.md`, `guides/tooltips-and-focus.md`, `guides/themes-and-styling.md`, `guides/coming-from-recharts.md`), the API reference (`reference/marks/`, `reference/scales-guides-and-color.md`) and the example catalog (`examples/`).
- `apps/frontend/node_modules/@tanstack/charts/skills/` — authoring skills (`design-a-chart`, `prepare-chart-data`, `configure-scales-guides-color`, `ship-accessible-charts`, `debug-and-verify-charts`).
- <https://tanstack.com/charts/latest/docs> and the catalog at <https://tanstack.com/charts/catalog/>.

Then validate with `check-types` and Biome, and ask the user to check light/dark, keyboard focus and phone width in the running app.
