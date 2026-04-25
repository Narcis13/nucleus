import "server-only"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { createCustomerPortalSession } from "@/lib/stripe/client"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type OpenCustomerPortalResult = {
  url: string
}

export async function openCustomerPortal(
  ctx: ServiceContext,
): Promise<OpenCustomerPortalResult> {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) {
    throw new UnauthorizedError(
      "No professional profile found for your account.",
    )
  }
  const url = await createCustomerPortalSession({ professionalId })
  return { url }
}
