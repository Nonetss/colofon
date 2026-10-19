import { type SyntheticEvent, useEffect, useState } from "react"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import { RoleSelect } from "@/features/profile/organizations/components/role-select"
import { useOrganizationInvite } from "@/features/profile/organizations/hooks/use-my-organizations"
import { assignableRoles } from "@/features/profile/organizations/model/permissions"
import type {
  MyOrganizationDetail,
  OrganizationRole,
} from "@/features/profile/organizations/model/types"

interface InviteDialogProps {
  organization: MyOrganizationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Invites someone by email; they accept it from their own profile. */
export function InviteDialog({
  organization,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const invite = useOrganizationInvite()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<OrganizationRole>("member")

  useEffect(() => {
    if (!open) return
    setEmail("")
    setRole("member")
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (invite.isPending) return
    onOpenChange(next)
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    await invite.mutateAsync({
      organizationId: organization.id,
      email: email.trim(),
      role,
    })
    handleOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Invitar a ${organization.name}`}
      description="No se envía ningún correo: avisa tú a la persona. Verá la invitación en su perfil, en Organizaciones, al entrar con este email. Caduca en 7 días."
      onSubmit={handleSubmit}
      isPending={invite.isPending}
      submitLabel="Invitar"
    >
      <FormField label="Email" htmlFor="invite-email">
        <Input
          id="invite-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label="Rol" htmlFor="invite-role">
        <RoleSelect
          id="invite-role"
          className="w-full"
          value={role}
          roles={assignableRoles(organization.role)}
          onValueChange={setRole}
        />
      </FormField>
    </FormDialog>
  )
}
