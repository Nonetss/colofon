import { Text, textVariants } from "@/components/shared/brand/typography"
import { QueryState } from "@/components/shared/feedback/query-state"
import { CopyButton } from "@/components/shared/form/copy-button"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { GitBrowser } from "@/features/admin/git-repository/components/git-browser"
import { useHostedRepositories } from "@/features/admin/git-repository/hooks/use-git-browser"
import { repositoryNamed } from "@/features/admin/git-repository/model/git-location"
import { appSurfaces } from "@/lib/app-surfaces"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const Back = getIcon("navigation", "back")
const FolderGit = getIcon("entities", "contentRepository")

/** The code screen of the hosted repository `slug`. */
export function GitRepositoryContent({ slug }: { slug: string }) {
  const { data, isPending, isError, refetch } = useHostedRepositories()

  return (
    <PageShell maxWidth="full" padding="none">
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <AppLink
          href={appSurfaces["admin-git"].path}
          className={cn(
            "-ml-1 flex w-fit items-center gap-1 transition-colors hover:text-foreground",
            textVariants({ role: "status", tone: "muted" })
          )}
        >
          <Back className="size-3" />
          {appSurfaces["admin-git"].label}
        </AppLink>
        <QueryState
          query={{ data, isPending, isError, refetch }}
          loading="Cargando repositorio..."
          error={{
            icon: <FolderGit className="size-6" />,
            title: "No se pudo cargar el repositorio",
            description:
              "Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde.",
          }}
          isEmpty={(repositories) =>
            repositoryNamed(repositories, slug) === undefined
          }
          empty={{
            icon: <FolderGit className="size-6" />,
            title: "No hay ningún repositorio alojado con ese nombre",
            description: `“${slug}” no existe o no está alojado en la plataforma.`,
            action: (
              <Button
                variant="outline"
                render={<AppLink href={appSurfaces["admin-git"].path} />}
                nativeButton={false}
              >
                Ver los repositorios
              </Button>
            ),
          }}
        >
          {(repositories) => {
            const repository = repositoryNamed(repositories, slug)
            if (repository === undefined) return null
            return (
              <>
                <PageHero
                  surface="admin-git-repository"
                  title={repository.name}
                  description={
                    <Text variant="data" tone="muted">
                      {repository.slug} · publica {repository.ref}
                    </Text>
                  }
                />
                {repository.pushUrl !== null && (
                  <PushUrl url={repository.pushUrl} name={repository.name} />
                )}
                <GitBrowser repository={repository} />
              </>
            )
          }}
        </QueryState>
      </div>
    </PageShell>
  )
}

function PushUrl({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-2.5">
      <Text variant="label" tone="muted" className="shrink-0">
        Git
      </Text>
      <Text variant="data" className="min-w-0 flex-1 truncate">
        {url}
      </Text>
      <CopyButton
        text={url}
        label={`Copiar la URL de git de ${name}`}
        copiedLabel="URL copiada"
        className="shrink-0"
      />
    </div>
  )
}
