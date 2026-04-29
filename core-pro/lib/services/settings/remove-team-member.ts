import "server-only"

import { clerkClient } from "@clerk/nextjs/server"

import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type RemoveTeamMemberInput = {
  userId: string
}

export type RemoveTeamMemberResult = {
  ok: true
}

export async function removeTeamMember(
  ctx: ServiceContext,
  input: RemoveTeamMemberInput,
): Promise<RemoveTeamMemberResult> {
  const professional = await getProfessional()
  if (!professional?.clerkOrgId) {
    throw new UnauthorizedError()
  }
  if (input.userId === ctx.userId) {
    throw new ServiceError(
      "You can't remove yourself — delete the workspace instead.",
    )
  }

  const client = await clerkClient()
  await client.organizations.deleteOrganizationMembership({
    organizationId: professional.clerkOrgId,
    userId: input.userId,
  })

  return { ok: true }
}
