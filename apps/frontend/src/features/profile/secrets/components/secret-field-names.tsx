import { Text } from "@/components/shared/brand/typography"

/** A secret's field names as chips; its values are never shown. */
export function SecretFieldNames({ fields }: { fields: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="label" tone="muted">
        Campos
      </Text>
      <ul className="flex flex-wrap gap-1.5">
        {fields.map((field) => (
          <li
            key={field}
            className="rounded-sm border bg-muted/40 px-1.5 py-0.5"
          >
            <Text variant="data">{field}</Text>
          </li>
        ))}
      </ul>
    </div>
  )
}
