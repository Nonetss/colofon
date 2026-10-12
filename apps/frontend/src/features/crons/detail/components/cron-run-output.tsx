import { textVariants } from "@/components/shared/brand/typography"
import { JsonView } from "@/components/shared/data-display/json-view"
import { CopyButton } from "@/components/shared/form/copy-button"
import {
  type CronRun,
  cronRunHasOutput,
} from "@/features/crons/detail/definitions/cron-run-columns.definition"
import { cn } from "@/lib/utils"

function stringifyForCopy(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** A run's error message, or its JSON result, with a copy button: the
 *  expanded detail of a run in the history table. */
export function CronRunOutput({ run }: { run: CronRun }) {
  if (!cronRunHasOutput(run)) return null
  const panelId = `cron-run-output-${run.id}`

  if (run.errorMessage) {
    return (
      <div className="relative">
        <pre
          id={panelId}
          className={cn(
            textVariants({ role: "data", tone: "destructive" }),
            "max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-destructive/20 bg-destructive/5 p-3 pr-11 leading-relaxed"
          )}
        >
          {run.errorMessage}
        </pre>
        <div className="absolute top-1.5 right-1.5">
          <CopyButton text={run.errorMessage} label="Copiar error" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <JsonView id={panelId} value={run.result} className="max-h-64 pr-11" />
      <div className="absolute top-1.5 right-1.5">
        <CopyButton
          text={stringifyForCopy(run.result)}
          label="Copiar resultado"
        />
      </div>
    </div>
  )
}
