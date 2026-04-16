import { sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentClerkUserId } from "./_helpers"

// ============================================================================
// NOTIFICATIONS — polymorphic recipient (professional | client). `user_type`
// disambiguates so RLS can resolve the right lookup.
// ============================================================================
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    userType: text("user_type").notNull(), // 'professional' | 'client'
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userType, t.userId),
    index("notifications_unread_idx").on(t.userType, t.userId, t.readAt),

    pgPolicy("notifications_recipient_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
    }),
    pgPolicy("notifications_recipient_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
      withCheck: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
    }),
  ],
)
