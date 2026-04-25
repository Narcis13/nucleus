import "server-only"

import { clerkClient } from "@clerk/nextjs/server"

import { getProfessional } from "@/lib/db/queries/professionals"
import { getPlan, planAtLeast } from "@/lib/stripe/plans"

import type { ServiceContext } from "../_lib/context"
import {
  PlanLimitError,
  ServiceError,
  UnauthorizedError,
} from "../_lib/errors"

export type InviteTeamMemberInput = {
  email: string
  role: "admin" | "member"
}

export type InviteTeamMemberResult = {
  invitationId: string
}

export async function inviteTeamMember(
  ctx: ServiceContext,
  input: InviteTeamMemberInput,
): Promise<InviteTeamMemberResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()
  const plan = getPlan(professional.plan)
  if (!planAtLeast(plan.id, "pro")) {
    throw new PlanLimitError("Team management requires the Pro plan.")
  }
  if (!professional.clerkOrgId) {
    throw new ServiceError("Complete onboarding before inviting team members.")
  }

  const client = await clerkClient()
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: professional.clerkOrgId,
    emailAddress: input.email,
    role: input.role === "admin" ? "org:admin" : "org:member",
    inviterUserId: ctx.userId,
    publicMetadata: {
      role: input.role === "admin" ? "professional" : "client",
      invited_as_team: input.role === "admin",
    },
  })

  return { invitationId: invitation.id }
}
