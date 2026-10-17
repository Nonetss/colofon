import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { OwnRepository } from "@/features/profile/repositories/model/types"
import { iconRef } from "@/lib/icon-registry"

export interface OwnRepositoryCardContext {
  onEdit: (repository: OwnRepository) => void
  onDelete: (repository: OwnRepository) => void
}

/** The card's menu; syncing has its own button on the card. */
export const ownRepositoryActions: RowActionDescriptor<
  OwnRepository,
  OwnRepositoryCardContext
>[] = [
  {
    key: "edit",
    label: "Editar",
    icon: iconRef("actions", "edit"),
    onSelect: (repository, ctx) => ctx.onEdit(repository),
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    onSelect: (repository, ctx) => ctx.onDelete(repository),
  },
]
