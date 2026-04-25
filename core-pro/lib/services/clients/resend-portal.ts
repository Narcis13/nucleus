import "server-only"

import { revokeClientPortalAccess } from "./revoke-portal"
import {
  inviteClientToPortal,
  type InviteClientToPortalResult,
} from "./invite-portal"

import type { ServiceContext } from "../_lib/context"

export type ResendClientPortalInviteInput = { clientId: string }
export type ResendClientPortalInviteResult = InviteClientToPortalResult

// Clerk has no native "resend" endpoint, so the workflow is revoke + recreate.
// Wraps both calls so the action layer can surface a single fresh URL to the
// agent.
export async function resendClientPortalInvite(
  ctx: ServiceContext,
  input: ResendClientPortalInviteInput,
): Promise<ResendClientPortalInviteResult> {
  await revokeClientPortalAccess(ctx, input)
  return inviteClientToPortal(ctx, input)
}
