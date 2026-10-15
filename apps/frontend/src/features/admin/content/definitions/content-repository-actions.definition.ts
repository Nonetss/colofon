import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { iconRef } from "@/lib/icon-registry"

export interface ContentRepositoryCardContext {
  onEdit: (repository: ContentRepository) => void
  onDelete: (repository: ContentRepository) => void
}

/** The card's menu; syncing has its own button on the card. */
export const contentRepositoryActions: RowActionDescriptor<
  ContentRepository,
  ContentRepositoryCardContext
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
