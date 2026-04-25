import "server-only"

import { clerkClient } from "@clerk/nextjs/server"

import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError, UnauthorizedError } from "../_lib/errors"

export type DeleteAccountInput = {
  confirmEmail: string
}

export type DeleteAccountResult = {
  ok: true
}

export async function deleteAccount(
  ctx: ServiceContext,
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()

  if (
    input.confirmEmail.trim().toLowerCase() !==
    professional.email.trim().toLowerCase()
  ) {
    throw new ServiceError("Confirmation email doesn't match.")
  }

  const client = await clerkClient()
  // Delete the org first (if any) so its membership invitations stop firing.
  if (professional.clerkOrgId) {
    try {
      await client.organizations.deleteOrganization(professional.clerkOrgId)
    } catch {
      // Non-fatal — the user delete below still removes their access.
    }
  }
  await client.users.deleteUser(ctx.userId)
  // The `user.deleted` webhook cascades DB cleanup. Return ok; the session
  // is already invalid by the time this resolves.
  return { ok: true }
}
