import "server-only"

import { asc, eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { getProfessionalIdForPublishedSlug } from "@/lib/db/queries/micro-sites"
import { leadActivities, leadStages, leads } from "@/lib/db/schema"

import { NotFoundError, ServiceError } from "../_lib/errors"

export type SubmitContactFormInput = {
  slug: string
  fullName: string
  email: string
  phone?: string
  message: string
  // Honeypot — real users leave this empty. Bots that auto-fill every input
  // land here and get a silent success.
  website?: string
}

export type SubmitContactFormResult = { ok: true; id?: string }

// Public-action service — invoked from the micro-site contact form. There is
// no RLS-scoped Tx and no Clerk session: writes go through `dbAdmin` because
// the row inserts (lead, activity) predate any RLS-eligible identity. The
// honeypot short-circuit lives here so any future non-action caller (cron
// import, MCP tool) gets the same spam guard.
export async function submitContactForm(
  input: SubmitContactFormInput,
): Promise<SubmitContactFormResult> {
  // Honeypot tripped — pretend success, skip the write.
  if (input.website && input.website.trim().length > 0) {
    return { ok: true }
  }

  const resolved = await getProfessionalIdForPublishedSlug(input.slug)
  if (!resolved) throw new NotFoundError("This site isn't live right now.")

  // Find (or fall back to) the "new" stage. Default pipeline is seeded
  // lazily when the professional first opens the pipeline, so a brand-new
  // workspace may have zero stages — we bail loudly in that rare case.
  const stageRows = await dbAdmin
    .select({
      id: leadStages.id,
      isWon: leadStages.isWon,
      isLost: leadStages.isLost,
    })
    .from(leadStages)
    .where(eq(leadStages.professionalId, resolved.professionalId))
    .orderBy(asc(leadStages.position))
  const firstStage = stageRows.find((s) => !s.isWon && !s.isLost) ?? stageRows[0]
  if (!firstStage) {
    throw new ServiceError(
      "The professional hasn't set up their pipeline yet — try again later.",
    )
  }

  const [created] = await dbAdmin
    .insert(leads)
    .values({
      professionalId: resolved.professionalId,
      stageId: firstStage.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
      source: "micro-site",
      notes: input.message,
      metadata: {
        slug: input.slug,
        micro_site_id: resolved.siteId,
      },
    })
    .returning()
  if (!created) throw new ServiceError("Couldn't save your message.")

  await dbAdmin.insert(leadActivities).values({
    leadId: created.id,
    type: "created",
    description: "Lead submitted from micro-site",
    metadata: { source: "micro-site", slug: input.slug },
  })

  return { ok: true, id: created.id }
}
