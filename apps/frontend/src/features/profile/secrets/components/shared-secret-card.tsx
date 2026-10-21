import { Text } from "@/components/shared/brand/typography"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SecretFieldNames } from "@/features/profile/secrets/components/secret-field-names"
import { SecretOrigins } from "@/features/profile/secrets/components/secret-origins"
import { allowedLabels } from "@/features/profile/secrets/model/secret-labels"
import type { SharedSecretItem } from "@/features/secrets/manage"
import { getIcon } from "@/lib/icon-registry"

const Building = getIcon("entities", "organization")

/**
 * A secret another user shares with the user through an organization:
 * read-only, with the prefix its placeholders start with.
 */
export function SharedSecretCard({ secret }: { secret: SharedSecretItem }) {
  return (
    <Card className="w-full gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex min-w-0 items-center gap-2">
          <Building
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <Text variant="title" className="truncate">
            {secret.prefix}
            {secret.name}
          </Text>
        </CardTitle>
        <CardDescription>
          <Text variant="compact" tone="muted">
            De {secret.ownerName}, a través de {secret.organization.name}
          </Text>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        {secret.description !== null && (
          <Text as="p" variant="compact" tone="muted">
            {secret.description}
          </Text>
        )}
        <SecretFieldNames fields={secret.fields} />
        <div className="flex flex-col gap-1">
          <Text variant="label" tone="muted">
            Orígenes
          </Text>
          <SecretOrigins origins={secret.origins} />
        </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-x-3 gap-y-1 border-t px-4 pt-3!">
        <Text variant="meta-sm" tone="muted" className="mr-auto">
          Marcadores: {`{{${secret.prefix}${secret.name}.<campo>}}`}
        </Text>
        {allowedLabels(secret).map((label) => (
          <StatusTag key={label} dotTone="primary">
            {label}
          </StatusTag>
        ))}
        {secret.unreadable && (
          <Text variant="meta-sm" tone="destructive">
            No se puede descifrar: solo su propietario puede arreglarlo.
          </Text>
        )}
      </CardFooter>
    </Card>
  )
}
