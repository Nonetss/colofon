import {
  keepPreviousData,
  skipToken,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query"
import type { MyOrganizationInput } from "@/features/profile/organizations/model/types"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { orpc } from "@/lib/orpc"

// A membership change also changes which shared repositories the reader
// lists, and the organizations the repository form offers.
const invalidate = [
  orpc.v1.myOrganization.key(),
  orpc.v1.docs.nav.key(),
  orpc.v1.content.listMyRepositories.key(),
]

export const useMyOrganizations = () =>
  useQuery(orpc.v1.myOrganization.list.queryOptions())

export const useReceivedInvitations = () =>
  useQuery(orpc.v1.myOrganization.listInvitations.queryOptions())

function detailInput(id: string | null) {
  if (id === null) return skipToken
  return { id }
}

/** One organization's members and invitations, read once `id` is set. */
export const useMyOrganization = (id: string | null) =>
  useQuery(orpc.v1.myOrganization.get.queryOptions({ input: detailInput(id) }))

export const useOrganizationCreate = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"create">) =>
      orpc.v1.myOrganization.create.call(input),
    success: "Organización creada",
    error: "No se pudo crear la organización",
    invalidate,
  })

export const useOrganizationUpdate = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"update">) =>
      orpc.v1.myOrganization.update.call(input),
    success: "Organización actualizada",
    error: "No se pudo actualizar la organización",
    invalidate,
  })

export const useOrganizationDelete = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"delete">) =>
      orpc.v1.myOrganization.delete.call(input),
    success: "Organización eliminada",
    error: "No se pudo eliminar la organización",
    invalidate,
  })

export const useOrganizationLeave = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"leave">) =>
      orpc.v1.myOrganization.leave.call(input),
    success: "Has salido de la organización",
    error: "No se pudo salir de la organización",
    invalidate,
  })

export const useOrganizationInvite = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"invite">) =>
      orpc.v1.myOrganization.invite.call(input),
    success: "Invitación creada",
    error: "No se pudo crear la invitación",
    invalidate,
  })

export const useInvitationCancel = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"cancelInvitation">) =>
      orpc.v1.myOrganization.cancelInvitation.call(input),
    success: "Invitación cancelada",
    error: "No se pudo cancelar la invitación",
    invalidate,
  })

export const useMemberRoleUpdate = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"updateMemberRole">) =>
      orpc.v1.myOrganization.updateMemberRole.call(input),
    success: "Rol actualizado",
    error: "No se pudo cambiar el rol",
    invalidate,
  })

export const useMemberRemove = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"removeMember">) =>
      orpc.v1.myOrganization.removeMember.call(input),
    success: "Miembro eliminado",
    error: "No se pudo eliminar al miembro",
    invalidate,
  })

export const useInvitationAccept = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"acceptInvitation">) =>
      orpc.v1.myOrganization.acceptInvitation.call(input),
    success: "Te has unido a la organización",
    error: "No se pudo aceptar la invitación",
    invalidate,
  })

export const useInvitationReject = () =>
  useOrpcMutation({
    mutationFn: (input: MyOrganizationInput<"rejectInvitation">) =>
      orpc.v1.myOrganization.rejectInvitation.call(input),
    success: "Invitación rechazada",
    error: "No se pudo rechazar la invitación",
    invalidate,
  })

type AddMemberInput = Parameters<typeof orpc.v1.organization.addMember.call>[0]

/** A global admin adds a user at once, without an invitation. */
export const useMemberAdd = () =>
  useOrpcMutation({
    mutationFn: (input: AddMemberInput) =>
      orpc.v1.organization.addMember.call(input),
    success: "Miembro añadido",
    error: "No se pudo añadir al miembro",
    invalidate,
  })

const CANDIDATES_PAGE_SIZE = 25
const MIN_SEARCH_LENGTH = 2

function candidateSearch(search: string): string | undefined {
  const trimmed = search.trim()
  if (trimmed.length < MIN_SEARCH_LENGTH) return undefined
  return trimmed
}

/**
 * The users a global admin can add, by name and paged for infinite scroll;
 * a search of 2+ characters narrows them by name or email, and the members
 * in `excludeIds` are left out.
 */
export function useMemberCandidates(
  search: string,
  excludeIds: readonly string[]
) {
  const debouncedSearch = useDebouncedValue(search)
  const query = useInfiniteQuery({
    ...orpc.v1.adminUser.list.infiniteOptions({
      input: (cursor: string | null) => ({
        search: candidateSearch(debouncedSearch),
        sort: "name",
        order: "asc",
        limit: CANDIDATES_PAGE_SIZE,
        cursor,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    placeholderData: keepPreviousData,
  })
  const loaded = query.data?.pages.flatMap((page) => page.users) ?? []
  return {
    users: loaded.filter((user) => !excludeIds.includes(user.id)),
    isPending: query.isPending,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
