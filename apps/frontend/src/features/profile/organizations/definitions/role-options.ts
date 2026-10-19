import type { OrganizationRole } from "@/features/profile/organizations/model/types"

export const ROLE_LABELS = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
} satisfies Record<OrganizationRole, string>

export const ROLE_DESCRIPTIONS = {
  owner: "Todo lo del administrador, y renombrar o borrar la organización.",
  admin: "Invita a personas, cambia roles y quita miembros.",
  member: "Lee los repositorios compartidos con la organización.",
} satisfies Record<OrganizationRole, string>
