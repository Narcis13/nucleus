import "server-only"

import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  clientSettings,
  clients,
  professionalSettings,
  professionals,
} from "@/lib/db/schema"
import type { NotificationPreferences } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Read/write notification preferences for a professional or client.
//
// Each user type has its own settings table (professional_settings,
// client_settings). We store the preferences as a jsonb so adding fields later
// doesn't require a migration. This module is the single place the rest of
// the app touches those tables for notification purposes.
// ─────────────────────────────────────────────────────────────────────────────

export type RecipientKey = {
  userId: string
  userType: "professional" | "client"
}

export type RecipientContact = {
  email: string
  fullName: string | null
  timezone: string | null
  preferences: NotificationPreferences | null
}

// Current user's prefs (RLS-scoped). Returns null when no settings row exists.
export async function getMyNotificationPreferences(
  key: RecipientKey,
): Promise<NotificationPreferences | null> {
  if (key.userType === "professional") {
    return withRLS(async (tx) => {
      const rows = await tx
        .select({ prefs: professionalSettings.notificationPreferences })
        .from(professionalSettings)
        .where(eq(professionalSettings.professionalId, key.userId))
        .limit(1)
      return (rows[0]?.prefs as NotificationPreferences | null) ?? null
    })
  }
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ prefs: clientSettings.notificationPreferences })
      .from(clientSettings)
      .where(eq(clientSettings.clientId, key.userId))
      .limit(1)
    return (rows[0]?.prefs as NotificationPreferences | null) ?? null
  })
}

// Upsert the current user's prefs. Returns the stored jsonb.
export async function updateMyNotificationPreferences(
  key: RecipientKey,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  if (key.userType === "professional") {
    await withRLS(async (tx) => {
      await tx
        .insert(professionalSettings)
        .values({
          professionalId: key.userId,
          notificationPreferences: prefs,
        })
        .onConflictDoUpdate({
          target: professionalSettings.professionalId,
          set: {
            notificationPreferences: prefs,
            updatedAt: new Date(),
          },
        })
    })
    return prefs
  }
  await withRLS(async (tx) => {
    await tx
      .insert(clientSettings)
      .values({
        clientId: key.userId,
        notificationPreferences: prefs,
      })
      .onConflictDoUpdate({
        target: clientSettings.clientId,
        set: {
          notificationPreferences: prefs,
          updatedAt: new Date(),
        },
      })
  })
  return prefs
}

// Service-role lookup used by the sender — fetches the address and preferences
// we need to decide how to deliver to `key`. Bypasses RLS because the sender
// often runs in a context where `key` is not the session user.
export async function getRecipientContact(
  key: RecipientKey,
): Promise<RecipientContact | null> {
  if (key.userType === "professional") {
    const rows = await dbAdmin
      .select({
        email: professionals.email,
        fullName: professionals.fullName,
        timezone: professionals.timezone,
        prefs: professionalSettings.notificationPreferences,
      })
      .from(professionals)
      .leftJoin(
        professionalSettings,
        eq(professionalSettings.professionalId, professionals.id),
      )
      .where(eq(professionals.id, key.userId))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      email: row.email,
      fullName: row.fullName,
      timezone: row.timezone,
      preferences: (row.prefs as NotificationPreferences | null) ?? null,
    }
  }
  const rows = await dbAdmin
    .select({
      email: clients.email,
      fullName: clients.fullName,
      prefs: clientSettings.notificationPreferences,
    })
    .from(clients)
    .leftJoin(clientSettings, eq(clientSettings.clientId, clients.id))
    .where(eq(clients.id, key.userId))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    email: row.email,
    fullName: row.fullName,
    timezone: null, // Clients inherit their pro's timezone; fine to default UTC in quiet-hours math.
    preferences: (row.prefs as NotificationPreferences | null) ?? null,
  }
}
