import { inlineLinkClass } from "@/components/shared/brand/inline-link"
import { Text } from "@/components/shared/brand/typography"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"
import { FormField } from "@/components/shared/form/field-label"
import { AppLink } from "@/components/ui/app-link"
import { useMyOrganizations } from "@/features/profile/organizations/hooks/use-my-organizations"
import { appSurfaces } from "@/lib/app-surfaces"

interface SharingFieldProps {
  /** The ids of the organizations picked. */
  value: string[]
  onChange: (organizationIds: string[]) => void
  /** What sharing gives the members, under the label. */
  hint: string
  /** What stays true without organizations, before the link to create one. */
  emptyText: string
}

function toggled(ids: string[], id: string, checked: boolean): string[] {
  if (checked) return [...ids, id]
  return ids.filter((each) => each !== id)
}

/**
 * The organizations something of the user's (a repository, a secret) is
 * shared with, among their own.
 */
export function SharingField({
  value,
  onChange,
  hint,
  emptyText,
}: SharingFieldProps) {
  const organizations = useMyOrganizations()
  const organizationsPath = appSurfaces["profile-organizations"].path

  if (organizations.isPending) {
    return (
      <FormField label="Compartir con">
        <Text as="p" variant="meta" tone="muted">
          Cargando tus organizaciones...
        </Text>
      </FormField>
    )
  }
  if (organizations.isError) {
    return (
      <FormField label="Compartir con">
        <Text as="p" variant="meta" tone="destructive">
          No se pudieron cargar tus organizaciones.
        </Text>
      </FormField>
    )
  }
  if (organizations.data.length === 0) {
    return (
      <FormField label="Compartir con">
        <Text as="p" variant="meta" tone="muted">
          {emptyText}{" "}
          <AppLink href={organizationsPath} className={inlineLinkClass}>
            Crea una o acepta una invitación
          </AppLink>{" "}
          para compartirlo.
        </Text>
      </FormField>
    )
  }

  return (
    <FormField label="Compartir con" hint={hint}>
      <ul aria-label="Organizaciones con las que compartirlo" className="-mx-2">
        {organizations.data.map((organization) => (
          <CheckboxRow
            key={organization.id}
            id={`share-${organization.id}`}
            label={organization.name}
            detail={`/${organization.slug}`}
            checked={value.includes(organization.id)}
            onCheckedChange={(checked) =>
              onChange(toggled(value, organization.id, checked))
            }
          />
        ))}
      </ul>
    </FormField>
  )
}
