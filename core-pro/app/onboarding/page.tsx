import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { syncUserToSupabase } from "@/lib/clerk/helpers"
import { getProfessional } from "@/lib/db/queries/professionals"

export const dynamic = "force-dynamic"

// Self-serve fallback for local/dev: if the Clerk webhook never delivered a
// `user.created` event, the professional row is missing and every
// dashboard gate bounces here. Re-run the same upsert the webhook does,
// sourced from the signed-in Clerk user, then send the caller on.
export default async function OnboardingPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in?redirect_url=/onboarding")

  const existing = await getProfessional()
  if (existing) redirect("/dashboard")

  await syncUserToSupabase({
    id: user.id,
    email_addresses: user.emailAddresses.map((e) => ({
      id: e.id,
      email_address: e.emailAddress,
    })),
    primary_email_address_id: user.primaryEmailAddressId,
    first_name: user.firstName,
    last_name: user.lastName,
    image_url: user.imageUrl,
    phone_numbers: user.phoneNumbers.map((p) => ({
      id: p.id,
      phone_number: p.phoneNumber,
    })),
    primary_phone_number_id: user.primaryPhoneNumberId,
  })

  redirect("/dashboard")
}
