import { AlertCircle } from "lucide-react"
import type { Metadata } from "next"

import { PublicFormFiller } from "@/components/share/public-form-filler"
import { resolvePublicShareByToken } from "@/lib/db/queries/forms"
import { emptyFormSchema, isFormSchema } from "@/types/forms"

export const metadata: Metadata = {
  // Stop search engines + previews from caching survey URLs.
  robots: { index: false, follow: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// Public form share page — anonymous fill surface for tokenized links.
//
// Trust boundary is the URL token. We resolve it to a share row, then
// render either:
//   - the fill form (active)             →  <PublicFormFiller>
//   - an "unavailable" state              →  expired / revoked / used up
//   - a "not found" state                 →  bad/typo'd token
//
// We deliberately render the same generic message for "expired", "revoked",
// and "exhausted" so a snooper can't probe to learn share state.
// ─────────────────────────────────────────────────────────────────────────────
export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolvePublicShareByToken(token)

  if (!resolved) {
    return <ShareUnavailable reason="This link is not valid." />
  }

  const { share, form } = resolved
  const isRevoked = share.revokedAt !== null
  const isExpired = share.expiresAt !== null && share.expiresAt.getTime() < Date.now()
  const isExhausted = share.responseCount >= share.maxResponses
  const isInactiveForm = !form.isActive

  if (isRevoked || isExpired || isExhausted || isInactiveForm) {
    return (
      <ShareUnavailable reason="This link is no longer active. Ask the sender for a new one if you still need to respond." />
    )
  }

  const schema = isFormSchema(form.schema) ? form.schema : emptyFormSchema()

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <PublicFormFiller
        token={token}
        schema={schema}
        title={form.title}
        description={form.description}
      />
    </main>
  )
}

function ShareUnavailable({ reason }: { reason: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <AlertCircle className="size-10 text-muted-foreground" />
      <h1 className="font-heading text-xl font-semibold text-foreground">
        Link unavailable
      </h1>
      <p className="text-sm text-muted-foreground">{reason}</p>
    </main>
  )
}
