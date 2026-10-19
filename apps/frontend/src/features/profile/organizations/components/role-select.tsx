import { Text } from "@/components/shared/brand/typography"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/features/profile/organizations/definitions/role-options"
import type { OrganizationRole } from "@/features/profile/organizations/model/types"

interface RoleSelectProps {
  id?: string
  value: OrganizationRole
  /** The roles offered; the current value is always shown. */
  roles: OrganizationRole[]
  onValueChange: (role: OrganizationRole) => void
  size?: "default" | "sm"
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

function isOffered(
  roles: OrganizationRole[],
  value: string
): value is OrganizationRole {
  return roles.some((role) => role === value)
}

/** A built-in organization role, each option with what it allows. */
export function RoleSelect({
  id,
  value,
  roles,
  onValueChange,
  size = "default",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: RoleSelectProps) {
  const options = roles.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }))
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null && isOffered(roles, next)) onValueChange(next)
      }}
    >
      <SelectTrigger
        id={id}
        size={size}
        className={className}
        aria-label={ariaLabel}
      >
        <SelectValue>{ROLE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-auto max-w-[min(20rem,var(--available-width))] min-w-(--anchor-width)">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              <Text
                variant="meta-sm"
                tone="muted"
                className="whitespace-normal text-pretty"
              >
                {ROLE_DESCRIPTIONS[option.value]}
              </Text>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
