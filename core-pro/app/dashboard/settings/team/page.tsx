import Link from "next/link"
import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProfessional } from "@/lib/db/queries/professionals"
import { getPlan, planAtLeast } from "@/lib/stripe/plans"

import { TeamMembers } from "./members"

export const dynamic = "force-dynamic"

export default async function TeamSettingsPage() {
  const professional = await getProfessional()
  if (!professional) redirect("/sign-in?redirect_url=/dashboard/settings/team")

  const plan = getPlan(professional.plan)
  const hasProPlan = planAtLeast(plan.id, "pro")

  if (!hasProPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team management</CardTitle>
          <CardDescription>
            Invite co-professionals to share this workspace. Available on the
            Pro plan and above.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Your current plan: <span className="font-medium">{plan.name}</span>.
          </p>
          <Button render={<Link href="/dashboard/settings/billing" />}>
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!professional.clerkOrgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team management</CardTitle>
          <CardDescription>
            You need a workspace organisation before inviting team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Finish onboarding to create your organisation. Once it exists, team
            invitations will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const client = await clerkClient()
  const [memberships, invitations] = await Promise.all([
    client.organizations.getOrganizationMembershipList({
      organizationId: professional.clerkOrgId,
      limit: 50,
    }),
    client.organizations.getOrganizationInvitationList({
      organizationId: professional.clerkOrgId,
      status: ["pending"],
    }),
  ])

  const members = memberships.data
    // Only include co-professionals (admins). Clients (org:member) are managed
    // elsewhere from the Clients list.
    .filter((m) => m.role === "org:admin" || m.role === "admin")
    .map((m) => ({
      id: m.id,
      userId: m.publicUserData?.userId ?? "",
      name:
        [m.publicUserData?.firstName, m.publicUserData?.lastName]
          .filter(Boolean)
          .join(" ") || m.publicUserData?.identifier || "Unknown",
      email: m.publicUserData?.identifier ?? "",
      imageUrl: m.publicUserData?.imageUrl ?? null,
      role: m.role === "org:admin" || m.role === "admin" ? "admin" : "member",
    }))

  const pending = invitations.data.map((inv) => ({
    id: inv.id,
    email: inv.emailAddress,
    role: inv.role === "org:admin" || inv.role === "admin" ? "admin" : "member",
    createdAt: inv.createdAt,
  }))

  return (
    <TeamMembers
      members={members}
      invitations={pending}
      currentClerkUserId={professional.clerkUserId}
    />
  )
}
