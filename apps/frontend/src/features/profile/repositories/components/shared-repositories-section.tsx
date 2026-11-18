import { Text } from "@/components/shared/brand/typography"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { SharedRepositoryCard } from "@/features/profile/repositories/components/shared-repository-card"
import { SharedRepositoryPathDialog } from "@/features/profile/repositories/components/shared-repository-path-dialog"
import {
  useSharedRepositoriesList,
  useSharedRepositorySync,
} from "@/features/profile/repositories/hooks/use-shared-repositories"
import type { SharedRepository } from "@/features/profile/repositories/model/types"
import { useTargetDialog } from "@/hooks/use-target-dialog"

/** Slug of the repository a pending sync acts on, or `null`. */
function syncingSlugOf(sync: {
  isPending: boolean
  variables?: { slug: string } | undefined
}): string | null {
  if (!sync.isPending || sync.variables === undefined) return null
  return sync.variables.slug
}

/**
 * The repositories other users shared with the user through an organization.
 * Hidden while there are none, so most users never see it.
 */
export function SharedRepositoriesSection() {
  const list = useSharedRepositoriesList()
  const sync = useSharedRepositorySync()
  const pathDialog = useTargetDialog<SharedRepository>()

  const repositories = list.data
  if (repositories === undefined || repositories.length === 0) return null

  const syncingSlug = syncingSlugOf(sync)

  return (
    <section className="mt-8 space-y-2">
      <SectionHeading title="Compartidos contigo" count={repositories.length} />
      <Text as="p" variant="meta" tone="muted">
        Repositorios de otros miembros de tus organizaciones. Los lees, los
        buscas y los sincronizas, pero no los editas; solo puedes cambiar la
        carpeta de la que se lee su contenido, y el cambio lo ve todo el mundo.
      </Text>
      <div className="@container">
        <ul
          aria-label="Repositorios compartidos contigo"
          className="grid gap-4 @3xl:grid-cols-2"
        >
          {repositories.map((repository) => (
            <li key={repository.id} className="flex min-w-0">
              <SharedRepositoryCard
                repository={repository}
                onSync={(each) => sync.mutate({ slug: each.slug })}
                onChangePath={pathDialog.open}
                syncing={syncingSlug === repository.slug}
                busy={syncingSlug === repository.slug}
              />
            </li>
          ))}
        </ul>
      </div>
      <SharedRepositoryPathDialog
        repository={pathDialog.target}
        {...pathDialog.dialogProps}
      />
    </section>
  )
}
