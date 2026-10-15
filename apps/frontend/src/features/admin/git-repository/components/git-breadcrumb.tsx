import { Fragment } from "react"
import { Text } from "@/components/shared/brand/typography"
import { breadcrumb } from "@/features/admin/git-repository/model/git-location"

interface GitBreadcrumbProps {
  repositoryName: string
  /** The folder shown, or the open file's folder. */
  folder: string
  /** The open file's name, the last crumb, which opens nothing. */
  fileName?: string
  onOpenFolder: (path: string) => void
}

/** The trail from the repository root to the folder or file shown. */
export function GitBreadcrumb({
  repositoryName,
  folder,
  fileName,
  onOpenFolder,
}: GitBreadcrumbProps) {
  const crumbs = breadcrumb(repositoryName, folder)
  const lastFolder = crumbs.length - 1

  return (
    <nav aria-label="Ruta" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {index > 0 && <Separator />}
            <li className="min-w-0">
              {index === lastFolder && fileName === undefined ? (
                <Text variant="data" aria-current="page">
                  {crumb.label}
                </Text>
              ) : (
                <button
                  type="button"
                  className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onOpenFolder(crumb.path)}
                >
                  <Text variant="data">{crumb.label}</Text>
                </button>
              )}
            </li>
          </Fragment>
        ))}
        {fileName !== undefined && (
          <>
            <Separator />
            <li className="min-w-0">
              <Text variant="data" aria-current="page">
                {fileName}
              </Text>
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}

function Separator() {
  return (
    <li aria-hidden>
      <Text variant="data" tone="muted">
        /
      </Text>
    </li>
  )
}
