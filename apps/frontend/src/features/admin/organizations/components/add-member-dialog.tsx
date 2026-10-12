import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")

import { type SyntheticEvent, useState } from "react"
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
import { RoleSelect } from "@/features/admin/organizations/components/role-select"
import { useMemberCandidates } from "@/features/admin/organizations/hooks/use-member-candidates"
import { useMemberAdd } from "@/features/admin/organizations/hooks/use-organization-detail"
import type { OrganizationCustomRole } from "@/features/admin/organizations/model/types"
import { useDialogForm } from "@/hooks/use-dialog-form"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { cn } from "@/lib/utils"

interface AddMemberDialogProps {
  organizationId: string
  existingUserIds: string[]
  customRoles: OrganizationCustomRole[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({
  organizationId,
  existingUserIds,
  customRoles,
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  const { mutateAsync, isPending } = useMemberAdd(organizationId)
  const form = useDialogForm(open, {
    searchInput: "",
    userId: "",
    role: "member",
  })

  const candidates = useMemberCandidates(
    form.values.searchInput,
    existingUserIds
  )
  const [listRoot, setListRoot] = useState<HTMLDivElement | null>(null)
  const sentinelRef = useInfiniteScroll(
    listRoot,
    candidates.fetchNextPage,
    candidates.hasNextPage && !candidates.isFetchingNextPage
  )
  const emptyLabel = form.values.searchInput.trim()
    ? "Ningún usuario coincide"
    : "No quedan usuarios por añadir"

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { userId, role } = form.values
    if (!userId) return
    await mutateAsync({ organizationId, userId, role })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Añadir miembro"
      description="Busca un usuario existente y asígnale un rol en la organización."
      onSubmit={handleSubmit}
      isPending={isPending}
      submitDisabled={!form.values.userId}
      submitLabel="Añadir"
    >
      <FormField label="Usuario" htmlFor="member-search">
        <Command
          shouldFilter={false}
          className="rounded-md border bg-transparent"
        >
          <CommandInput
            id="member-search"
            placeholder="Filtrar por nombre o email..."
            className="text-base md:text-sm"
            value={form.values.searchInput}
            onValueChange={(value) => form.set("searchInput", value)}
          />
          <CommandList ref={setListRoot} className="max-h-56">
            {candidates.isPending ? (
              <Text as="p" tone="muted" className="py-6 text-center">
                Cargando usuarios...
              </Text>
            ) : (
              <>
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                <CommandGroup>
                  {candidates.users.map((user) => {
                    const isSelected = form.values.userId === user.id
                    return (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => form.set("userId", user.id)}
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
                            !isSelected && "invisible"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                <div ref={sentinelRef} aria-hidden className="h-px" />
              </>
            )}
          </CommandList>
        </Command>
      </FormField>

      <FormField label="Rol" htmlFor="member-role">
        <RoleSelect
          id="member-role"
          className="w-full"
          value={form.values.role}
          onValueChange={(role) => form.set("role", role)}
          customRoles={customRoles}
          showDescription
        />
      </FormField>
    </FormDialog>
  )
}
