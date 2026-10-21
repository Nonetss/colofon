import { beforeEach, describe, expect, test } from "bun:test"
import {
  invitationRow,
  memberRow,
  organizationRow,
  stepArgs,
  userRow,
} from "@nonete/db/testing"
import { call } from "@orpc/server"
import {
  adminContext,
  anonymousContext,
  apiKeyContext,
  userContext,
} from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import {
  canManageMembers,
  myOrganizationHandler,
  roleOf,
} from "#v1/my-organization/handler"
import { myOrganizationInput } from "#v1/my-organization/input"
import { myOrganizationRouter } from "#v1/my-organization/router"

const context = userContext()
const USER_ID = "user-id"
const ORG_ID = "org-1"
const TOMORROW = new Date(Date.now() + 24 * 60 * 60 * 1000)
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000)

const ownMember = memberRow({ id: "member-own", userId: USER_ID })
const ownAdmin = memberRow({ id: "member-own", userId: USER_ID, role: "admin" })
const ownOwner = memberRow({ id: "member-own", userId: USER_ID, role: "owner" })
const otherMember = memberRow({ id: "member-luis", userId: "luis" })
const otherOwner = memberRow({
  id: "member-ana",
  userId: "ana",
  role: "owner",
})

/** The first value a recorded write's `step` received. */
function firstArg(op: "insert" | "update" | "delete", step: string, at = 0) {
  const recorded = fakeDb.calls(op)[at]
  if (!recorded) throw new Error(`no ${op} recorded`)
  return stepArgs(recorded, step)[0]
}

function noWrites() {
  expect(fakeDb.calls("insert")).toEqual([])
  expect(fakeDb.calls("update")).toEqual([])
  expect(fakeDb.calls("delete")).toEqual([])
}

beforeEach(() => {
  fakeDb.reset()
})

describe("roles", () => {
  test("the most powerful built-in role wins, and a custom one counts as member", () => {
    expect(roleOf("owner")).toBe("owner")
    expect(roleOf("member,admin")).toBe("admin")
    expect(roleOf("admin, owner")).toBe("owner")
    expect(roleOf("editor")).toBe("member")
    expect(roleOf(null)).toBe("member")
  })

  test("owners and admins manage members, members don't", () => {
    expect(canManageMembers("owner")).toBe(true)
    expect(canManageMembers("admin")).toBe(true)
    expect(canManageMembers("member")).toBe(false)
  })
})

describe("access", () => {
  test("without a session it is UNAUTHORIZED, and with an API key FORBIDDEN", async () => {
    await expectErrorCode(
      call(myOrganizationRouter.list, undefined, {
        context: anonymousContext(),
      }),
      "UNAUTHORIZED"
    )
    await expectErrorCode(
      call(myOrganizationRouter.list, undefined, { context: apiKeyContext() }),
      "FORBIDDEN"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("an organization the caller doesn't belong to is NOT_FOUND", async () => {
    for (const run of [
      () => myOrganizationHandler.get({ context, input: { id: ORG_ID } }),
      () =>
        myOrganizationHandler.update({
          context,
          input: { id: ORG_ID, name: "Otra" },
        }),
      () => myOrganizationHandler.delete({ context, input: { id: ORG_ID } }),
      () => myOrganizationHandler.leave({ context, input: { id: ORG_ID } }),
    ]) {
      fakeDb.queue("query.member.findFirst", undefined)
      await expectErrorCode(run(), "NOT_FOUND")
    }
    noWrites()
  })
})

describe("myOrganization.list", () => {
  test("lists the caller's organizations by name with their role and member count", async () => {
    fakeDb.queue("query.member.findMany", [
      {
        ...memberRow({ role: "member" }),
        organization: {
          ...organizationRow({ id: "org-z", name: "Zeta", slug: "zeta" }),
          members: [memberRow(), memberRow({ id: "member-2" })],
        },
      },
      {
        ...memberRow({ role: "owner" }),
        organization: {
          ...organizationRow({ name: "Alfa", slug: "alfa" }),
          members: [memberRow()],
        },
      },
    ])

    const list = await myOrganizationHandler.list({ context })

    expect(
      list.map(({ slug, role, memberCount }) => [slug, role, memberCount])
    ).toEqual([
      ["alfa", "owner", 1],
      ["zeta", "member", 2],
    ])
    const [find] = fakeDb.calls("query.member.findMany")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findMany")[0]).toMatchObject({
      where: { userId: USER_ID },
    })
  })
})

describe("myOrganization.get", () => {
  const detail = {
    ...organizationRow(),
    members: [
      { ...ownMember, user: userRow({ id: USER_ID, name: "Yo" }) },
      { ...otherOwner, user: userRow({ id: "ana", name: "Ana" }) },
    ],
    invitations: [
      invitationRow({ id: "pending", expiresAt: TOMORROW }),
      invitationRow({ id: "expired", expiresAt: YESTERDAY }),
      invitationRow({ id: "done", status: "accepted", expiresAt: TOMORROW }),
    ],
  }

  test("a member sees the members and no invitations", async () => {
    fakeDb.queue("query.member.findFirst", ownMember)
    fakeDb.queue("query.organization.findFirst", detail)

    const answer = await myOrganizationHandler.get({
      context,
      input: { id: ORG_ID },
    })

    expect(answer.role).toBe("member")
    expect(
      answer.members.map((each) => [each.name, each.role, each.isCaller])
    ).toEqual([
      ["Ana", "owner", false],
      ["Yo", "member", true],
    ])
    expect(answer.invitations).toEqual([])
    expect(answer.canAddMembers).toBe(false)
  })

  test("a global admin may add users directly", async () => {
    fakeDb.queue("query.member.findFirst", { ...ownMember, userId: "admin-id" })
    fakeDb.queue("query.organization.findFirst", detail)

    const answer = await myOrganizationHandler.get({
      context: adminContext(),
      input: { id: ORG_ID },
    })

    expect(answer.canAddMembers).toBe(true)
  })

  test("an admin sees the pending invitations only", async () => {
    fakeDb.queue("query.member.findFirst", ownAdmin)
    fakeDb.queue("query.organization.findFirst", detail)

    const answer = await myOrganizationHandler.get({
      context,
      input: { id: ORG_ID },
    })

    expect(answer.invitations.map((each) => each.id)).toEqual(["pending"])
  })
})

describe("myOrganization.create", () => {
  test("a taken slug is CONFLICT and nothing is written", async () => {
    fakeDb.queue("query.organization.findFirst", organizationRow())

    await expectErrorCode(
      myOrganizationHandler.create({
        context,
        input: { name: "Acme", slug: "acme" },
      }),
      "CONFLICT"
    )
    noWrites()
  })

  test("creates the organization with the caller as its only owner", async () => {
    fakeDb.queue("query.organization.findFirst", undefined)
    fakeDb.queue("insert", undefined, undefined)

    const created = await myOrganizationHandler.create({
      context,
      input: { name: "Equipo docs", slug: "equipo-docs" },
    })

    expect(created).toMatchObject({
      name: "Equipo docs",
      slug: "equipo-docs",
      role: "owner",
      memberCount: 1,
    })
    expect(fakeDb.calls("transaction")).toHaveLength(1)
    expect(firstArg("insert", "values", 0)).toMatchObject({
      id: created.id,
      name: "Equipo docs",
      slug: "equipo-docs",
    })
    expect(firstArg("insert", "values", 1)).toMatchObject({
      organizationId: created.id,
      userId: USER_ID,
      role: "owner",
    })
  })

  test("the slug follows the organization slug rules", () => {
    expect(
      myOrganizationInput.create.safeParse({ name: "A", slug: "Mi Org" })
        .success
    ).toBe(false)
  })
})

describe("myOrganization.update and delete", () => {
  test("only an owner renames or deletes", async () => {
    fakeDb.queue("query.member.findFirst", ownAdmin)
    await expectErrorCode(
      myOrganizationHandler.update({
        context,
        input: { id: ORG_ID, name: "Otra" },
      }),
      "FORBIDDEN"
    )
    fakeDb.queue("query.member.findFirst", ownAdmin)
    await expectErrorCode(
      myOrganizationHandler.delete({ context, input: { id: ORG_ID } }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("re-slugging to another organization's slug is CONFLICT", async () => {
    fakeDb.queue("query.member.findFirst", ownOwner)
    fakeDb.queue(
      "query.organization.findFirst",
      organizationRow({ id: "org-2", slug: "casa" })
    )

    await expectErrorCode(
      myOrganizationHandler.update({
        context,
        input: { id: ORG_ID, slug: "casa" },
      }),
      "CONFLICT"
    )
    noWrites()
  })

  test("an owner renames, keeping the slug", async () => {
    fakeDb.queue("query.member.findFirst", ownOwner)
    fakeDb.queue("update", undefined)
    fakeDb.queue("query.organization.findFirst", {
      ...organizationRow({ name: "Otra" }),
      members: [ownOwner],
    })

    const answer = await myOrganizationHandler.update({
      context,
      input: { id: ORG_ID, name: "Otra" },
    })

    expect(firstArg("update", "set")).toEqual({
      name: "Otra",
      slug: undefined,
    })
    expect(answer).toMatchObject({ name: "Otra", role: "owner" })
  })

  test("an owner deletes it", async () => {
    fakeDb.queue("query.member.findFirst", ownOwner)
    fakeDb.queue("delete", undefined)

    expect(
      await myOrganizationHandler.delete({ context, input: { id: ORG_ID } })
    ).toEqual({ id: ORG_ID, success: true })
    expect(fakeDb.calls("delete")).toHaveLength(1)
  })
})

describe("myOrganization.leave", () => {
  test("the last owner can't leave", async () => {
    fakeDb.queue("query.member.findFirst", ownOwner)
    fakeDb.queue("query.member.findMany", [ownOwner, otherMember])

    await expectErrorCode(
      myOrganizationHandler.leave({ context, input: { id: ORG_ID } }),
      "CONFLICT"
    )
    noWrites()
  })

  test("an owner leaves when another owner stays", async () => {
    fakeDb.queue("query.member.findFirst", ownOwner)
    fakeDb.queue("query.member.findMany", [ownOwner, otherOwner])
    fakeDb.queue("delete", undefined, undefined, undefined)

    await myOrganizationHandler.leave({ context, input: { id: ORG_ID } })

    expect(fakeDb.calls("delete")).toHaveLength(3)
  })

  test("a member leaves, and their repository and secret shares with it end in the same transaction", async () => {
    fakeDb.queue("query.member.findFirst", ownMember)
    fakeDb.queue("delete", undefined, undefined, undefined)

    expect(
      await myOrganizationHandler.leave({ context, input: { id: ORG_ID } })
    ).toEqual({ id: ORG_ID, success: true })
    expect(fakeDb.calls().map((each) => each.op)).toEqual([
      "query.member.findFirst",
      "transaction",
      "delete",
      "delete",
      "delete",
    ])
  })
})

describe("myOrganization.invite", () => {
  const input = {
    organizationId: ORG_ID,
    email: "pablo@example.com",
    role: "member" as const,
  }

  test("a member can't invite", async () => {
    fakeDb.queue("query.member.findFirst", ownMember)

    await expectErrorCode(
      myOrganizationHandler.invite({ context, input }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("an admin can't invite an owner", async () => {
    fakeDb.queue("query.member.findFirst", ownAdmin)

    await expectErrorCode(
      myOrganizationHandler.invite({
        context,
        input: { ...input, role: "owner" },
      }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("someone already in the organization is CONFLICT", async () => {
    fakeDb.queue("query.member.findFirst", ownAdmin, otherMember)
    fakeDb.queue("query.user.findFirst", userRow({ id: "luis" }))

    await expectErrorCode(
      myOrganizationHandler.invite({ context, input }),
      "CONFLICT"
    )
    noWrites()
  })

  test("an email with a pending invitation is CONFLICT; an expired one isn't in the way", async () => {
    fakeDb.queue("query.member.findFirst", ownAdmin)
    fakeDb.queue("query.user.findFirst", undefined)
    fakeDb.queue("query.invitation.findMany", [
      invitationRow({ expiresAt: TOMORROW }),
    ])
    await expectErrorCode(
      myOrganizationHandler.invite({ context, input }),
      "CONFLICT"
    )
    noWrites()

    fakeDb.queue("query.member.findFirst", ownAdmin)
    fakeDb.queue("query.user.findFirst", undefined)
    fakeDb.queue("query.invitation.findMany", [
      invitationRow({ expiresAt: YESTERDAY }),
    ])
    fakeDb.queue("insert", [invitationRow({ expiresAt: TOMORROW })])
    await myOrganizationHandler.invite({ context, input })
    expect(firstArg("insert", "values")).toMatchObject({
      organizationId: ORG_ID,
      email: "pablo@example.com",
      role: "member",
      status: "pending",
      inviterId: USER_ID,
    })
  })

  test("the email is stored lowercased", () => {
    expect(
      myOrganizationInput.invite.parse({ ...input, email: "Pablo@Example.com" })
        .email
    ).toBe("pablo@example.com")
  })
})

describe("myOrganization.cancelInvitation", () => {
  test("a member can't cancel, an admin can", async () => {
    fakeDb.queue("query.invitation.findFirst", invitationRow())
    fakeDb.queue("query.member.findFirst", ownMember)
    await expectErrorCode(
      myOrganizationHandler.cancelInvitation({
        context,
        input: { id: "invitation-1" },
      }),
      "FORBIDDEN"
    )
    noWrites()

    fakeDb.queue("query.invitation.findFirst", invitationRow())
    fakeDb.queue("query.member.findFirst", ownAdmin)
    fakeDb.queue("update", undefined)
    await myOrganizationHandler.cancelInvitation({
      context,
      input: { id: "invitation-1" },
    })
    expect(firstArg("update", "set")).toEqual({ status: "canceled" })
  })
})

describe("myOrganization.updateMemberRole", () => {
  const withUser = <Row extends object>(row: Row) => ({
    ...row,
    user: userRow({ name: "Ana" }),
  })

  test("an admin can't demote an owner or make someone owner", async () => {
    fakeDb.queue("query.member.findFirst", withUser(otherOwner), ownAdmin)
    await expectErrorCode(
      myOrganizationHandler.updateMemberRole({
        context,
        input: { memberId: "member-ana", role: "member" },
      }),
      "FORBIDDEN"
    )
    fakeDb.queue("query.member.findFirst", withUser(otherMember), ownAdmin)
    await expectErrorCode(
      myOrganizationHandler.updateMemberRole({
        context,
        input: { memberId: "member-luis", role: "owner" },
      }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("demoting the last owner is CONFLICT", async () => {
    fakeDb.queue("query.member.findFirst", withUser(ownOwner), ownOwner)
    fakeDb.queue("query.member.findMany", [ownOwner, otherMember])

    await expectErrorCode(
      myOrganizationHandler.updateMemberRole({
        context,
        input: { memberId: "member-own", role: "admin" },
      }),
      "CONFLICT"
    )
    noWrites()
  })

  test("an admin promotes a member to admin", async () => {
    fakeDb.queue("query.member.findFirst", withUser(otherMember), ownAdmin)
    fakeDb.queue("update", undefined)

    const answer = await myOrganizationHandler.updateMemberRole({
      context,
      input: { memberId: "member-luis", role: "admin" },
    })

    expect(firstArg("update", "set")).toEqual({ role: "admin" })
    expect(answer).toMatchObject({ id: "member-luis", role: "admin" })
  })
})

describe("myOrganization.removeMember", () => {
  test("an admin can't remove an owner", async () => {
    fakeDb.queue("query.member.findFirst", otherOwner, ownAdmin)

    await expectErrorCode(
      myOrganizationHandler.removeMember({
        context,
        input: { memberId: "member-ana" },
      }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("a member can't remove anyone", async () => {
    fakeDb.queue("query.member.findFirst", otherMember, ownMember)

    await expectErrorCode(
      myOrganizationHandler.removeMember({
        context,
        input: { memberId: "member-luis" },
      }),
      "FORBIDDEN"
    )
    noWrites()
  })

  test("an admin removes a member and their repository and secret shares with the organization", async () => {
    fakeDb.queue("query.member.findFirst", otherMember, ownAdmin)
    fakeDb.queue("delete", undefined, undefined, undefined)

    await myOrganizationHandler.removeMember({
      context,
      input: { memberId: "member-luis" },
    })

    expect(fakeDb.calls("transaction")).toHaveLength(1)
    expect(fakeDb.calls("delete")).toHaveLength(3)
  })
})

describe("invitations addressed to the caller", () => {
  test("lists the pending, unexpired ones", async () => {
    fakeDb.queue("query.invitation.findMany", [
      {
        ...invitationRow({ id: "fresh", expiresAt: TOMORROW }),
        organization: organizationRow({ name: "Equipo docs" }),
        inviter: userRow({ name: "Ana" }),
      },
      {
        ...invitationRow({ id: "old", expiresAt: YESTERDAY }),
        organization: organizationRow(),
        inviter: userRow(),
      },
    ])

    const list = await myOrganizationHandler.listInvitations({ context })

    expect(list).toEqual([
      {
        id: "fresh",
        organization: { id: ORG_ID, name: "Equipo docs", slug: "acme" },
        role: "member",
        inviterName: "Ana",
        expiresAt: TOMORROW.toISOString(),
      },
    ])
    const [find] = fakeDb.calls("query.invitation.findMany")
    if (!find) throw new Error("no query recorded")
    expect(stepArgs(find, "findMany")[0]).toMatchObject({
      where: { email: "user@example.com", status: "pending" },
    })
  })

  test("someone else's, expired or answered invitation is NOT_FOUND", async () => {
    for (const row of [
      invitationRow({ email: "pablo@example.com", expiresAt: TOMORROW }),
      invitationRow({ email: "user@example.com", expiresAt: YESTERDAY }),
      invitationRow({
        email: "user@example.com",
        status: "canceled",
        expiresAt: TOMORROW,
      }),
    ]) {
      fakeDb.queue("query.invitation.findFirst", row)
      await expectErrorCode(
        myOrganizationHandler.acceptInvitation({
          context,
          input: { id: row.id },
        }),
        "NOT_FOUND"
      )
    }
    fakeDb.queue("query.invitation.findFirst", undefined)
    await expectErrorCode(
      myOrganizationHandler.rejectInvitation({
        context,
        input: { id: "nada" },
      }),
      "NOT_FOUND"
    )
    noWrites()
  })

  test("accepting joins with the invitation's role and marks it accepted", async () => {
    const mine = invitationRow({
      email: "USER@example.com",
      role: "admin",
      expiresAt: TOMORROW,
    })
    fakeDb.queue("query.invitation.findFirst", mine)
    fakeDb.queue("query.member.findFirst", undefined)
    fakeDb.queue("insert", undefined)
    fakeDb.queue("update", undefined)
    fakeDb.queue("query.organization.findFirst", {
      ...organizationRow(),
      members: [otherOwner, ownAdmin],
    })

    const joined = await myOrganizationHandler.acceptInvitation({
      context,
      input: { id: mine.id },
    })

    expect(firstArg("insert", "values")).toMatchObject({
      organizationId: ORG_ID,
      userId: USER_ID,
      role: "admin",
    })
    expect(firstArg("update", "set")).toEqual({ status: "accepted" })
    expect(joined).toMatchObject({ id: ORG_ID, role: "admin", memberCount: 2 })
  })

  test("declining marks it rejected", async () => {
    const mine = invitationRow({
      email: "user@example.com",
      expiresAt: TOMORROW,
    })
    fakeDb.queue("query.invitation.findFirst", mine)
    fakeDb.queue("update", undefined)

    await myOrganizationHandler.rejectInvitation({
      context,
      input: { id: mine.id },
    })

    expect(firstArg("update", "set")).toEqual({ status: "rejected" })
  })
})
