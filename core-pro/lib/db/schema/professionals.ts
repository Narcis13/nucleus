import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { createdAt, currentClerkUserId, updatedAt } from "./_helpers"

// ============================================================================
// PROFESSIONALS — the paying tenant (1:1 with a Clerk user + Clerk org).
//
// `id` is an internal uuid (NOT the Clerk user id, which is a prefixed string
// like `user_2abc...`). Clerk identity is carried in `clerk_user_id` /
// `clerk_org_id`, so RLS can reference `auth.jwt() ->> 'sub'` directly.
// ============================================================================
export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    clerkOrgId: text("clerk_org_id").unique(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    specialization: text("specialization").array(),
    certifications: text("certifications").array(),
    timezone: text("timezone").default("Europe/Bucharest").notNull(),
    locale: text("locale").default("ro").notNull(),
    currency: text("currency").default("EUR").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    plan: text("plan").default("starter").notNull(),
    planLimits: jsonb("plan_limits"),
    branding: jsonb("branding"),
    onboardingCompleted: boolean("onboarding_completed")
      .default(false)
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("professionals_clerk_user_id_idx").on(t.clerkUserId),
    index("professionals_clerk_org_id_idx").on(t.clerkOrgId),

    // Professional can read and update their own row. Insert/delete run under
    // the service role from the Clerk webhook — no authenticated-role policies
    // are granted for those operations.
    pgPolicy("professionals_self_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.clerkUserId} = ${currentClerkUserId}`,
    }),
    pgPolicy("professionals_self_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.clerkUserId} = ${currentClerkUserId}`,
      withCheck: sql`${t.clerkUserId} = ${currentClerkUserId}`,
    }),
  ],
)
