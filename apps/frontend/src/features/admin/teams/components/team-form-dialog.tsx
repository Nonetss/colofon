import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")

import type { SyntheticEvent } from "react"
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
import { Input } from "@/components/ui/input"
import { useOrganizationsList } from "@/features/admin/organizations/public"
import {
  useTeamCreate,
  useTeamUpdate,
} from "@/features/admin/teams/hooks/use-teams"
import type { Team } from "@/features/admin/teams/model/types"
import { useDialogForm } from "@/hooks/use-dialog-form"
import { foldText } from "@/lib/fold-text"
import { cn } from "@/lib/utils"

interface TeamFormDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamFormDialog({
  team,
  open,
  onOpenChange,
}: TeamFormDialogProps) {
  const createTeam = useTeamCreate()
  const updateTeam = useTeamUpdate()
  const isEditing = !!team

  const form = useDialogForm(
    open,
    { name: "", organizationId: "" },
    { name: team?.name ?? "" }
  )

  const organizations = useOrganizationsList()
  const emptyLabel = organizations.data?.length
    ? "Ninguna organización coincide"
    : "Todavía no hay organizaciones"

  const isPending = createTeam.isPending || updateTeam.isPending

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { name, organizationId } = form.trimmed()
    if (isEditing && team) {
      await updateTeam.mutateAsync({ id: team.id, name })
    } else {
      if (!organizationId) return
      await createTeam.mutateAsync({ organizationId, name })
    }
    handleOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Editar equipo" : "Nuevo equipo"}
      description={
        isEditing
          ? "Cambia el nombre del equipo."
          : "Crea un equipo dentro de una organización."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitDisabled={!isEditing && !form.values.organizationId}
      submitLabel={isEditing ? "Guardar" : "Crear equipo"}
    >
      {!isEditing ? (
        <FormField label="Organización" htmlFor="team-org-search">
          <Command
            filter={(itemValue, search) =>
              Number(foldText(itemValue).includes(foldText(search)))
            }
            className="rounded-md border bg-transparent"
          >
            <CommandInput
              id="team-org-search"
              placeholder="Filtrar por nombre o slug..."
              className="text-base md:text-sm"
            />
            <CommandList className="max-h-56">
              {organizations.isPending ? (
                <Text as="p" tone="muted" className="py-6 text-center">
                  Cargando organizaciones...
                </Text>
              ) : (
                <>
                  <CommandEmpty>{emptyLabel}</CommandEmpty>
                  <CommandGroup>
                    {organizations.data?.map((org) => {
                      const isSelected = form.values.organizationId === org.id
                      return (
                        <CommandItem
                          key={org.id}
                          value={`${org.name} ${org.slug} ${org.id}`}
                          onSelect={() => form.set("organizationId", org.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <Text as="p" variant="title" className="truncate">
                              {org.name}
                            </Text>
                            <Text
                              as="p"
                              variant="data"
                              tone="muted"
                              className="truncate"
                            >
                              /{org.slug}
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
                </>
              )}
            </CommandList>
          </Command>
        </FormField>
      ) : null}

      <FormField label="Nombre" htmlFor="team-name">
        <Input
          id="team-name"
          required
          value={form.values.name}
          onChange={(e) => form.set("name", e.target.value)}
        />
      </FormField>
    </FormDialog>
  )
}
