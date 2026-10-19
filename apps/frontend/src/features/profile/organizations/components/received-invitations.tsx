import { surfaceVariants } from "@/components/shared/brand/surface"
import { Text } from "@/components/shared/brand/typography"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS } from "@/features/profile/organizations/definitions/role-options"
import {
  useInvitationAccept,
  useInvitationReject,
  useReceivedInvitations,
} from "@/features/profile/organizations/hooks/use-my-organizations"
import type { ReceivedInvitation } from "@/features/profile/organizations/model/types"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

function InvitationRow({
  invitation,
  busy,
  onAccept,
  onReject,
}: {
  invitation: ReceivedInvitation
  busy: boolean
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <li className="@container flex flex-col gap-3 p-4 @md:flex-row @md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text variant="title" className="truncate">
          {invitation.organization.name}
        </Text>
        <Text variant="meta" tone="muted">
          {invitation.inviterName} te invita como{" "}
          {ROLE_LABELS[invitation.role].toLowerCase()} · caduca el{" "}
          {formatDate(invitation.expiresAt)}
        </Text>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={onAccept}>
          Aceptar
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
          Rechazar
        </Button>
      </div>
    </li>
  )
}

/** The invitations waiting for the user; nothing when there are none. */
export function ReceivedInvitations() {
  const invitations = useReceivedInvitations()
  const accept = useInvitationAccept()
  const reject = useInvitationReject()
  const list = invitations.data
  if (list === undefined || list.length === 0) return null
  const busy = accept.isPending || reject.isPending

  return (
    <section className="space-y-2">
      <SectionHeading title="Invitaciones para ti" count={list.length} />
      <ul
        aria-label="Invitaciones para ti"
        className={cn("divide-y", surfaceVariants())}
      >
        {list.map((invitation) => (
          <InvitationRow
            key={invitation.id}
            invitation={invitation}
            busy={busy}
            onAccept={() => accept.mutate({ id: invitation.id })}
            onReject={() => reject.mutate({ id: invitation.id })}
          />
        ))}
      </ul>
    </section>
  )
}
