import { sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
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

// ============================================================================
// PUSH_SUBSCRIPTIONS — per-device Web Push endpoint for a user (professional or
// client). `endpoint` is globally unique across the browser vendor network, so
// we use it as the conflict target when a browser re-subscribes.
// ============================================================================
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    userType: text("user_type").notNull(), // 'professional' | 'client'
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("push_subscriptions_endpoint_unique").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userType, t.userId),

    pgPolicy("push_subscriptions_owner_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
    }),
    pgPolicy("push_subscriptions_owner_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
    }),
    pgPolicy("push_subscriptions_owner_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`
        (${t.userType} = 'professional' and ${t.userId} in (select id from public.professionals where clerk_user_id = ${currentClerkUserId}))
        or
        (${t.userType} = 'client' and ${t.userId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId}))
      `,
    }),
  ],
)
