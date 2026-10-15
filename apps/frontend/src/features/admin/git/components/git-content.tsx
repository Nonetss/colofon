import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { SearchInput } from "@/components/shared/form/search-input"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ContentRepositoryFormDialog } from "@/features/admin/content"
import { GitRepositoryCard } from "@/features/admin/git/components/git-repository-card"
import { useHostedRepositories } from "@/features/admin/git/hooks/use-hosted-repositories"
import { matchesSearch } from "@/features/admin/git/model/repository-search"
import { useQueryParam } from "@/hooks/use-query-param"
import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Plus = getIcon("actions", "add")

export function GitContent() {
  const {
    data: repositories = [],
    isPending,
    isError,
    refetch,
  } = useHostedRepositories()
  const [query, setQuery] = useQueryParam("q", "")
  const [creating, setCreating] = useState(false)
  const shown = repositories.filter((repository) =>
    matchesSearch(repository, query)
  )
  const countLabel =
    repositories.length === 1 ? "repositorio alojado" : "repositorios alojados"

  return (
    <>
      <ResourceOverview
        maxWidth="80%"
        surface="admin-git"
        heroMeta={
          <HeroCount
            segments={[{ count: repositories.length, label: countLabel }]}
          />
        }
        heroAction={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nuevo repositorio
          </Button>
        }
        heroChildren={
          <Text
            as="p"
            variant="compact"
            tone="muted"
            className="border-y py-3 leading-relaxed"
          >
            Los repositorios que guarda la plataforma. Abre uno para ver su
            código rama a rama; los cambios llegan con git push.
          </Text>
        }
        filters={
          repositories.length > 0 && (
            <SearchInput
              label="Buscar repositorios"
              placeholder="Buscar por nombre o slug"
              value={query}
              onValueChange={setQuery}
              className="max-w-sm"
            />
          )
        }
        query={{ data: shown, isPending, isError, refetch }}
        loading="Cargando repositorios..."
        error={{
          icon: <FolderGit className="size-6" />,
          title: "No se pudieron cargar los repositorios",
          description:
            "Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        hasActiveFilters={query.trim() !== ""}
        filteredEmpty={{
          icon: <FolderGit className="size-6" />,
          title: "Ningún repositorio coincide",
          description: `No hay repositorios alojados que contengan “${query.trim()}”.`,
          onClear: () => setQuery(""),
          clearLabel: "Borrar la búsqueda",
        }}
        empty={{
          icon: <FolderGit className="size-6" />,
          title: "No hay repositorios alojados",
          description:
            "Crea un repositorio en la plataforma y súbele el historial con git push.",
          action: (
            <Button onClick={() => setCreating(true)}>Nuevo repositorio</Button>
          ),
        }}
      >
        {(data) => (
          <div className="@container">
            <ul
              aria-label="Repositorios alojados"
              className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3"
            >
              {data.map((repository) => (
                <li key={repository.id} className="flex min-w-0">
                  <GitRepositoryCard repository={repository} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </ResourceOverview>

      <ContentRepositoryFormDialog
        repository={null}
        open={creating}
        onOpenChange={setCreating}
        hostedOnly
      />
    </>
  )
}
