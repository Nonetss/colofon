import type { SecretListItem } from "@/features/secrets/manage"

type SecretFlags = Pick<
  SecretListItem,
  "allowWrite" | "allowInUrl" | "allowInBody"
>

/** The flags the secret has turned on, as their short Spanish names. */
export function allowedLabels(secret: SecretFlags): string[] {
  const labels: string[] = []
  if (secret.allowWrite) labels.push("Escritura")
  if (secret.allowInUrl) labels.push("En URL")
  if (secret.allowInBody) labels.push("En body")
  return labels
}

/** Who a secret of the user's is shared with, or that it is private. */
export function sharingLabel(secret: Pick<SecretListItem, "organizations">) {
  if (secret.organizations.length === 0) return "Privado"
  return secret.organizations
    .map((organization) => organization.name)
    .join(", ")
}
