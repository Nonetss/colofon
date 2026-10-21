import { inlineLinkClass } from "@/components/shared/brand/inline-link"
import { Text } from "@/components/shared/brand/typography"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"
import { FormField } from "@/components/shared/form/field-label"
import { AppLink } from "@/components/ui/app-link"
import { useShareableOrganizations } from "@/features/profile/repositories/hooks/use-own-repositories"
import { appSurfaces } from "@/lib/app-surfaces"

interface SharingFieldProps {
  /** The ids of the organizations picked. */
  value: string[]
  onChange: (organizationIds: string[]) => void
}

function toggled(ids: string[], id: string, checked: boolean): string[] {
  if (checked) return [...ids, id]
  return ids.filter((each) => each !== id)
}

/** The organizations a repository is shared with, among the user's own. */
export function SharingField({ value, onChange }: SharingFieldProps) {
  const organizations = useShareableOrganizations()
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
          No perteneces a ninguna organización, así que solo tú lo lees.{" "}
          <AppLink href={organizationsPath} className={inlineLinkClass}>
            Crea una o acepta una invitación
          </AppLink>{" "}
          para compartirlo.
        </Text>
      </FormField>
    )
  }

  return (
    <FormField
      label="Compartir con"
      hint="Sus miembros lo leen como tú, mientras sigas en la organización. Solo tú lo editas."
    >
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
