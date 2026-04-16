import { sql } from "drizzle-orm"
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import {
  createdAt,
  currentClerkUserId,
  currentProfessionalIdSql,
} from "./_helpers"
import { clients } from "./clients"
import { professionals } from "./professionals"

// ============================================================================
// MESSAGING — one conversation per professional/client pair, N messages.
// Policies ensure only the two participants see the thread.
// ============================================================================
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("conversations_unique").on(t.professionalId, t.clientId),
    index("conversations_professional_id_idx").on(t.professionalId),
    index("conversations_client_id_idx").on(t.clientId),

    pgPolicy("conversations_participants_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`
        ${t.professionalId} = ${currentProfessionalIdSql}
        or ${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})
      `,
      withCheck: sql`
        ${t.professionalId} = ${currentProfessionalIdSql}
        or ${t.clientId} in (select id from public.clients where clerk_user_id = ${currentClerkUserId})
      `,
    }),
  ],
)

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull(),
    senderRole: text("sender_role").notNull(),
    content: text("content"),
    type: text("type").default("text").notNull(),
    mediaUrl: text("media_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("messages_conversation_id_idx").on(t.conversationId),
    index("messages_created_at_idx").on(t.createdAt),

    pgPolicy("messages_participants_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`
        ${t.conversationId} in (
          select id from public.conversations
          where professional_id = ${currentProfessionalIdSql}
             or client_id in (select id from public.clients where clerk_user_id = ${currentClerkUserId})
        )
      `,
      withCheck: sql`
        ${t.conversationId} in (
          select id from public.conversations
          where professional_id = ${currentProfessionalIdSql}
             or client_id in (select id from public.clients where clerk_user_id = ${currentClerkUserId})
        )
      `,
    }),
  ],
)
