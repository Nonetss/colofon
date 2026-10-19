import { openapi } from "@orpc/openapi"
import { sessionProcedure } from "#index"
import { myOrganizationHandler } from "#v1/my-organization/handler"
import { myOrganizationInput } from "#v1/my-organization/input"
import { myOrganizationOutput } from "#v1/my-organization/output"

const tags = ["Organizations"]

// Only from a browser session: joining, inviting and sharing widen who reads
// a user's documentation, which an agent holding an API key must not do.
export const myOrganizationRouter = {
  list: sessionProcedure
    .meta(
      openapi({
        summary: "List the caller's organizations",
        description:
          "Lists the organizations the caller belongs to, ordered by name, each with the caller's role and its member count. Only from a browser session.",
        tags,
        method: "GET",
      })
    )
    .output(myOrganizationOutput.list)
    .handler(({ context }) => myOrganizationHandler.list({ context })),

  get: sessionProcedure
    .meta(
      openapi({
        summary: "Get one of the caller's organizations",
        description:
          "Gets an organization the caller belongs to, with its members and, for its owners and admins, its pending invitations. NOT_FOUND when the caller is not a member. Only from a browser session.",
        tags,
        method: "GET",
      })
    )
    .input(myOrganizationInput.get)
    .output(myOrganizationOutput.get)
    .handler(({ context, input }) =>
      myOrganizationHandler.get({ context, input })
    ),

  create: sessionProcedure
    .meta(
      openapi({
        summary: "Create an organization",
        description:
          "Creates an organization with the caller as its only owner. CONFLICT when the slug is taken. Only from a browser session.",
        tags,
        method: "POST",
        successStatus: 201,
      })
    )
    .input(myOrganizationInput.create)
    .output(myOrganizationOutput.create)
    .handler(({ context, input }) =>
      myOrganizationHandler.create({ context, input })
    ),

  update: sessionProcedure
    .meta(
      openapi({
        summary: "Rename an organization",
        description:
          "Changes the name or slug of an organization, keeping omitted fields. Owners only. Only from a browser session.",
        tags,
        method: "PATCH",
      })
    )
    .input(myOrganizationInput.update)
    .output(myOrganizationOutput.update)
    .handler(({ context, input }) =>
      myOrganizationHandler.update({ context, input })
    ),

  delete: sessionProcedure
    .meta(
      openapi({
        summary: "Delete an organization",
        description:
          "Deletes an organization with its members, invitations and repository shares. Owners only. Only from a browser session.",
        tags,
        method: "DELETE",
      })
    )
    .input(myOrganizationInput.delete)
    .output(myOrganizationOutput.delete)
    .handler(({ context, input }) =>
      myOrganizationHandler.delete({ context, input })
    ),

  leave: sessionProcedure
    .meta(
      openapi({
        summary: "Leave an organization",
        description:
          "Removes the caller from an organization and ends the shares of the caller's repositories with it. CONFLICT for its last owner. Only from a browser session.",
        tags,
        method: "POST",
      })
    )
    .input(myOrganizationInput.leave)
    .output(myOrganizationOutput.leave)
    .handler(({ context, input }) =>
      myOrganizationHandler.leave({ context, input })
    ),

  invite: sessionProcedure
    .meta(
      openapi({
        summary: "Invite someone to an organization",
        description:
          "Stores a pending invitation for an email with a role, without sending anything. Owners and admins; only owners invite as owner. CONFLICT when that email is a member or already invited. Only from a browser session.",
        tags,
        method: "POST",
        successStatus: 201,
      })
    )
    .input(myOrganizationInput.invite)
    .output(myOrganizationOutput.invite)
    .handler(({ context, input }) =>
      myOrganizationHandler.invite({ context, input })
    ),

  cancelInvitation: sessionProcedure
    .meta(
      openapi({
        summary: "Cancel an invitation",
        description:
          "Cancels a pending invitation of an organization the caller manages. Owners and admins. Only from a browser session.",
        tags,
        method: "POST",
      })
    )
    .input(myOrganizationInput.cancelInvitation)
    .output(myOrganizationOutput.cancelInvitation)
    .handler(({ context, input }) =>
      myOrganizationHandler.cancelInvitation({ context, input })
    ),

  updateMemberRole: sessionProcedure
    .meta(
      openapi({
        summary: "Change a member's role",
        description:
          "Changes a member's role. Owners and admins; only owners grant or revoke owner. CONFLICT when it would leave no owner. Only from a browser session.",
        tags,
        method: "PATCH",
      })
    )
    .input(myOrganizationInput.updateMemberRole)
    .output(myOrganizationOutput.updateMemberRole)
    .handler(({ context, input }) =>
      myOrganizationHandler.updateMemberRole({ context, input })
    ),

  removeMember: sessionProcedure
    .meta(
      openapi({
        summary: "Remove a member",
        description:
          "Removes a member and ends the shares of their repositories with the organization. Owners and admins; only owners remove an owner. CONFLICT for the last owner. Only from a browser session.",
        tags,
        method: "DELETE",
      })
    )
    .input(myOrganizationInput.removeMember)
    .output(myOrganizationOutput.removeMember)
    .handler(({ context, input }) =>
      myOrganizationHandler.removeMember({ context, input })
    ),

  listInvitations: sessionProcedure
    .meta(
      openapi({
        summary: "List the caller's invitations",
        description:
          "Lists the pending, unexpired invitations addressed to the caller's email. Only from a browser session.",
        tags,
        method: "GET",
      })
    )
    .output(myOrganizationOutput.listInvitations)
    .handler(({ context }) =>
      myOrganizationHandler.listInvitations({ context })
    ),

  acceptInvitation: sessionProcedure
    .meta(
      openapi({
        summary: "Accept an invitation",
        description:
          "Joins the organization of an invitation addressed to the caller, with its role. NOT_FOUND when it is someone else's, expired or not pending. Only from a browser session.",
        tags,
        method: "POST",
      })
    )
    .input(myOrganizationInput.acceptInvitation)
    .output(myOrganizationOutput.acceptInvitation)
    .handler(({ context, input }) =>
      myOrganizationHandler.acceptInvitation({ context, input })
    ),

  rejectInvitation: sessionProcedure
    .meta(
      openapi({
        summary: "Decline an invitation",
        description:
          "Declines an invitation addressed to the caller. NOT_FOUND when it is someone else's, expired or not pending. Only from a browser session.",
        tags,
        method: "POST",
      })
    )
    .input(myOrganizationInput.rejectInvitation)
    .output(myOrganizationOutput.rejectInvitation)
    .handler(({ context, input }) =>
      myOrganizationHandler.rejectInvitation({ context, input })
    ),
}
