import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import {
  createLeadMagnetClaim,
  getPublishedLeadMagnet,
} from "@/lib/db/queries/marketing"
import { getProfessionalIdForPublishedSlug } from "@/lib/db/queries/micro-sites"
import { professionals } from "@/lib/db/schema"
import { env } from "@/lib/env"
import { sendEmail } from "@/lib/resend/client"
import { getPlan } from "@/lib/stripe/plans"
import type { Branding } from "@/types/domain"

import { NotFoundError, ServiceError } from "../_lib/errors"
import { LEAD_MAGNET_CLAIM_TTL_MS } from "./_lib"

export type RequestLeadMagnetInput = {
  slug: string
  leadMagnetId: string
  fullName: string
  email: string
  phone?: string
  // Honeypot — see micro-sites contact-form for pattern.
  website?: string
}

export type RequestLeadMagnetResult = { ok: true; sent: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// requestLeadMagnet
//
// Public-action service. Double opt-in: the form submission no longer creates
// a lead — it only mints a single-use `lead_magnet_claims` row keyed by
// sha256(token), and emails the visitor a `/m/claim/<token>` link. The lead +
// activity + download record are created when (and only when) the link is
// clicked, which proves the address is reachable.
//
// Honeypot short-circuit returns `{ sent: false }` — bots don't get any
// signal that they were filtered.
// ─────────────────────────────────────────────────────────────────────────────
export async function requestLeadMagnet(
  input: RequestLeadMagnetInput,
): Promise<RequestLeadMagnetResult> {
  if (input.website && input.website.trim().length > 0) {
    return { ok: true, sent: false }
  }

  const resolved = await getProfessionalIdForPublishedSlug(input.slug)
  if (!resolved) throw new NotFoundError("This site isn't live right now.")

  const magnet = await getPublishedLeadMagnet(input.leadMagnetId)
  if (!magnet || magnet.professionalId !== resolved.professionalId) {
    throw new NotFoundError("That download isn't available.")
  }

  // Pull the bits of the professional we need for the branded email shell.
  const proRows = await dbAdmin
    .select({
      id: professionals.id,
      fullName: professionals.fullName,
      branding: professionals.branding,
      locale: professionals.locale,
      plan: professionals.plan,
    })
    .from(professionals)
    .where(eq(professionals.id, resolved.professionalId))
    .limit(1)
  const pro = proRows[0]
  if (!pro) {
    throw new ServiceError("That download isn't available right now.")
  }

  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(rawToken).digest()
  const expiresAt = new Date(Date.now() + LEAD_MAGNET_CLAIM_TTL_MS)
  const expiresInMinutes = Math.round(LEAD_MAGNET_CLAIM_TTL_MS / 60000)

  await createLeadMagnetClaim({
    leadMagnetId: magnet.id,
    professionalId: pro.id,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone || null,
    slug: input.slug,
    tokenHash,
    expiresAt,
  })

  const claimUrl = new URL(`/m/claim/${rawToken}`, env.NEXT_PUBLIC_APP_URL).toString()

  const result = await sendEmail({
    to: input.email,
    template: "lead-magnet-claim",
    tenantId: pro.id,
    plan: getPlan(pro.plan).id,
    data: {
      professionalName: pro.fullName,
      branding: (pro.branding ?? null) as Branding | null,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      locale: pro.locale,
      recipientName: input.fullName,
      magnetTitle: magnet.title,
      claimUrl,
      expiresInMinutes,
    },
  })

  if (!result.sent) {
    if (result.reason === "no_resend") {
      throw new ServiceError(
        "Email delivery isn't configured — the professional needs to add a Resend API key before downloads work.",
      )
    }
    throw new ServiceError(
      "We couldn't send the confirmation email — please try again in a minute.",
    )
  }

  return { ok: true, sent: true }
}
