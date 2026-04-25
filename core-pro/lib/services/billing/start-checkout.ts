import "server-only"

import { getCurrentProfessionalId } from "@/lib/clerk/helpers"
import { createCheckoutSession } from "@/lib/stripe/client"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type StartCheckoutInput = {
  planId: "starter" | "growth" | "pro"
}

export type StartCheckoutResult = {
  url: string
}

export async function startCheckout(
  ctx: ServiceContext,
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  const professionalId = await getCurrentProfessionalId()
  if (!professionalId) {
    throw new UnauthorizedError(
      "No professional profile found for your account.",
    )
  }
  const url = await createCheckoutSession({
    professionalId,
    planId: input.planId,
  })
  return { url }
}
