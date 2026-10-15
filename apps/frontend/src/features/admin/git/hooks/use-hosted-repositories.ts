import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

/** The content repositories the platform hosts, ordered by name. */
export const useHostedRepositories = () =>
  useQuery(
    orpc.v1.content.listRepositories.queryOptions({
      select: (repositories) =>
        repositories.filter((repository) => repository.hosted),
    })
  )
