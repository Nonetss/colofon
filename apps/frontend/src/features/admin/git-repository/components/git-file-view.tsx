import { useMemo } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { HighlightedTokens } from "@/components/shared/data-display/highlighted-tokens"
import { fileTokens } from "@/features/admin/git-repository/model/file-highlight"
import {
  formatBytes,
  lineCount,
} from "@/features/admin/git-repository/model/git-location"
import type { RepositoryFile } from "@/features/admin/git-repository/model/types"
import { cn } from "@/lib/utils"

function unshownReason(file: RepositoryFile): string {
  if (file.kind === "binary") {
    return "Es un fichero binario: no se muestra como texto."
  }
  return "Es demasiado grande para mostrarlo aquí (más de 512 KB)."
}

/** A file's text with line numbers, or why it isn't shown. */
export function GitFileView({ file }: { file: RepositoryFile }) {
  const { content, path } = file
  const tokens = useMemo(() => {
    if (content === null) return []
    return fileTokens(content, path)
  }, [content, path])

  if (content === null) {
    return (
      <div className="rounded-md border px-4 py-6">
        <Text as="p" variant="compact" tone="muted">
          {unshownReason(file)} Ocupa {formatBytes(file.size)}.
        </Text>
      </div>
    )
  }

  const lines = lineCount(content)
  const linesLabel = lines === 1 ? "línea" : "líneas"
  const numbers = Array.from({ length: lines }, (_, index) => index + 1)
  const code = cn(
    textVariants({ role: "data" }),
    "m-0 py-3 leading-6 whitespace-pre"
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      <Text
        as="p"
        variant="compact"
        tone="muted"
        className="border-b bg-muted/40 px-3 py-1.5 tabular-nums"
      >
        {lines} {linesLabel} · {formatBytes(file.size)}
      </Text>
      <div className="flex min-h-0 flex-1 overflow-auto">
        <pre
          aria-hidden
          className={cn(
            code,
            "sticky left-0 shrink-0 border-r bg-background px-3 text-right text-muted-foreground select-none"
          )}
        >
          {numbers.join("\n")}
        </pre>
        <pre className={cn(code, "px-4")}>
          <HighlightedTokens tokens={tokens} />
        </pre>
      </div>
    </div>
  )
}
