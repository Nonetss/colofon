import { type SyntheticEvent, useEffect, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { RoleSelect } from "@/features/profile/organizations/components/role-select"
import {
  useMemberAdd,
  useMemberCandidates,
} from "@/features/profile/organizations/hooks/use-my-organizations"
import type {
  MyOrganizationDetail,
  OrganizationRole,
} from "@/features/profile/organizations/model/types"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const Check = getIcon("controls", "check")

const ALL_ROLES: OrganizationRole[] = ["owner", "admin", "member"]

interface AddMemberDialogProps {
  organization: MyOrganizationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function emptyLabelOf(search: string): string {
  if (search.trim() === "") return "No quedan usuarios por añadir"
  return "Ningún usuario coincide"
}

/**
 * A global admin's shortcut: adds an existing user to the organization at
 * once, with a role, instead of inviting them.
 */
export function AddMemberDialog({
  organization,
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  const add = useMemberAdd()
  const [search, setSearch] = useState("")
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<OrganizationRole>("member")

  useEffect(() => {
    if (!open) return
    setSearch("")
    setUserId("")
    setRole("member")
  }, [open])

  const candidates = useMemberCandidates(
    search,
    organization.members.map((member) => member.userId)
  )
  const [listRoot, setListRoot] = useState<HTMLDivElement | null>(null)
  const sentinelRef = useInfiniteScroll(
    listRoot,
    candidates.fetchNextPage,
    candidates.hasNextPage && !candidates.isFetchingNextPage
  )

  const handleOpenChange = (next: boolean) => {
    if (add.isPending) return
    onOpenChange(next)
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (userId === "") return
    await add.mutateAsync({ organizationId: organization.id, userId, role })
    handleOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Añadir a ${organization.name}`}
      description="Como administrador de la plataforma, añades a la persona directamente, sin invitación: desde ya lee los repositorios compartidos con la organización."
      onSubmit={handleSubmit}
      isPending={add.isPending}
      submitDisabled={userId === ""}
      submitLabel="Añadir"
    >
      <FormField label="Usuario" htmlFor="add-member-search">
        <Command
          shouldFilter={false}
          className="rounded-md border bg-transparent"
        >
          <CommandInput
            id="add-member-search"
            placeholder="Filtrar por nombre o email..."
            className="text-base md:text-sm"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={setListRoot} className="max-h-56">
            {candidates.isPending ? (
              <Text as="p" tone="muted" className="py-6 text-center">
                Cargando usuarios...
              </Text>
            ) : (
              <>
                <CommandEmpty>{emptyLabelOf(search)}</CommandEmpty>
                <CommandGroup>
                  {candidates.users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => setUserId(user.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <Text as="p" variant="title" className="truncate">
                          {user.name}
                        </Text>
                        <Text
                          as="p"
                          variant="compact"
                          tone="muted"
                          className="truncate"
                        >
                          {user.email}
                        </Text>
                      </div>
                      <Check
                        className={cn(
                          "text-primary",
                          userId !== user.id && "invisible"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <div ref={sentinelRef} aria-hidden className="h-px" />
              </>
            )}
          </CommandList>
        </Command>
      </FormField>
      <FormField label="Rol" htmlFor="add-member-role">
        <RoleSelect
          id="add-member-role"
          className="w-full"
          value={role}
          roles={ALL_ROLES}
          onValueChange={setRole}
        />
      </FormField>
    </FormDialog>
  )
}
