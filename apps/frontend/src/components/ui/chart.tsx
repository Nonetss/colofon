import type { ChartValue } from "@tanstack/charts"
import {
  Chart as ChartHost,
  type ChartProps as ChartHostProps,
} from "@tanstack/charts/react"

import { cn } from "@/lib/utils"

/**
 * The adapter's props with sizing narrowed to the app's policy: width always
 * follows the container (islands are `client:only`, so no `initialWidth`) and
 * every chart states its height in pixels.
 */
type ChartProps<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> = Omit<
  ChartHostProps<TDatum, TXValue, TYValue>,
  "height" | "aspectRatio" | "width" | "initialWidth"
> & {
  height: number
}

/**
 * A TanStack Charts chart in the app's theme. Palette (`--chart-1..6`) and
 * tooltip chrome come from the `.ts-chart-host` rule in `global.css`; axis
 * text and gridlines inherit the muted text color and app font set here, so
 * a theme switch recolors the chart without rebuilding its definition.
 */
function Chart<TDatum, TXValue extends ChartValue, TYValue extends ChartValue>({
  className,
  ...props
}: ChartProps<TDatum, TXValue, TYValue>) {
  return (
    <ChartHost
      className={cn(
        "min-w-0 font-sans text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export type { ChartProps }
export { Chart }
