"use server"

import { z } from "zod"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { portalAction } from "@/lib/actions/safe-action"
import { PORTAL_COOKIE_NAME, revokeSession } from "@/lib/portal-auth/session"

// ─────────────────────────────────────────────────────────────────────────────
// signOutPortalAction
//
// Revokes the active portal session row, clears the `nucleus_portal` cookie,
// and redirects to the sign-in page. Replaces the Clerk `signOut()` call the
// portal header used before the auth refactor.
// ─────────────────────────────────────────────────────────────────────────────
export const signOutPortalAction = portalAction
  .metadata({ actionName: "portal-sign-out" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    await revokeSession(ctx.sessionId)
    const cookieStore = await cookies()
    cookieStore.delete(PORTAL_COOKIE_NAME)
    redirect("/portal/sign-in")
  })
