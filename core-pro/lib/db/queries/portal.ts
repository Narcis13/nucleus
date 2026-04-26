import "server-only"

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import {
  clients,
  conversations,
  documents,
  formAssignments,
  formResponses,
  forms,
  messages,
} from "@/lib/db/schema"
import type {
  Document,
  Form,
  FormAssignment,
  FormResponse,
  Message,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Portal-side queries.
//
// Trust boundary: the calling Server Component / Server Action has already
// resolved a portal session (`requirePortalSession()` gives `clientId` +
// `professionalId`). These queries take those ids as explicit args and scope
// every WHERE on them — there is no `withRLS` here because portal users have
// no Clerk JWT to satisfy `auth.jwt() ->> 'sub'` policies.
//
// Use `dbAdmin` (service role) so the queries succeed with the schema's RLS
// enabled; the explicit `client_id` / `professional_id` filters take the
// place of policies for this surface.
// ─────────────────────────────────────────────────────────────────────────────

// Identity surface for a portal client. The portal layout passes the result
// to <PortalHeader> so the avatar dropdown can render the client's name +
// email + avatar without a client-side hop. The session cookie is the trust
// boundary; this query just hydrates labels.
export async function getPortalClientIdentity(clientId: string): Promise<{
  fullName: string
  email: string
  avatarUrl: string | null
} | null> {
  const [row] = await dbAdmin
    .select({
      fullName: clients.fullName,
      email: clients.email,
      avatarUrl: clients.avatarUrl,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
  return row ?? null
}

// Resolve (or create) the single conversation between a client and their
// professional. Mirror of `getOrCreatePortalConversation` but driven by the
// portal session instead of Clerk.
export async function getOrCreatePortalConversationFor(
  clientId: string,
  professionalId: string,
) {
  const [existing] = await dbAdmin
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.professionalId, professionalId),
        eq(conversations.clientId, clientId),
      ),
    )
    .limit(1)
  if (existing) return { conversation: existing, clientId }

  const [created] = await dbAdmin
    .insert(conversations)
    .values({ professionalId, clientId })
    .returning()
  if (!created) return null
  return { conversation: created, clientId }
}

// Messages for a conversation, scoped to a single client. Returns [] if the
// conversation isn't theirs (defensive — the page already resolves the
// conversation by clientId, but the extra filter is cheap insurance).
export async function getPortalMessages(
  conversationId: string,
  clientId: string,
): Promise<Message[]> {
  return dbAdmin
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      senderRole: messages.senderRole,
      content: messages.content,
      type: messages.type,
      mediaUrl: messages.mediaUrl,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(conversations.clientId, clientId),
      ),
    )
    .orderBy(asc(messages.createdAt))
}

// Insert a message authored by a client into one of their conversations.
// Verifies the conversation belongs to the client before writing — a
// mis-targeted UUID returns `null` and the action surfaces an error.
export async function sendPortalMessage(args: {
  conversationId: string
  clientId: string
  content?: string | null
  type: "text" | "image" | "file"
  mediaUrl?: string | null
}): Promise<Message | null> {
  const [convo] = await dbAdmin
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, args.conversationId),
        eq(conversations.clientId, args.clientId),
      ),
    )
    .limit(1)
  if (!convo) return null

  const [created] = await dbAdmin
    .insert(messages)
    .values({
      conversationId: args.conversationId,
      senderId: args.clientId,
      senderRole: "client",
      content: args.content ?? undefined,
      type: args.type,
      mediaUrl: args.mediaUrl ?? undefined,
    })
    .returning()
  if (!created) return null

  await dbAdmin
    .update(conversations)
    .set({ lastMessageAt: created.createdAt })
    .where(eq(conversations.id, args.conversationId))
  return created
}

// Mark inbound (professional → client) messages as read. Idempotent.
// Returns the rows that flipped so callers can broadcast read receipts.
export async function markPortalMessagesRead(args: {
  conversationId: string
  clientId: string
}): Promise<Array<{ id: string }>> {
  const [convo] = await dbAdmin
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, args.conversationId),
        eq(conversations.clientId, args.clientId),
      ),
    )
    .limit(1)
  if (!convo) return []

  return dbAdmin
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, args.conversationId),
        eq(messages.senderRole, "professional"),
        isNull(messages.readAt),
      ),
    )
    .returning({ id: messages.id })
}

// Form assignments belonging to a single client + the latest response per
// assignment for the "completed" badge.
export async function getPortalAssignments(clientId: string): Promise<
  Array<{
    assignment: FormAssignment
    form: Form
    response: Pick<FormResponse, "id" | "submittedAt"> | null
  }>
> {
  const rows = await dbAdmin
    .select({
      assignment: formAssignments,
      form: forms,
      responseId: formResponses.id,
      responseSubmittedAt: formResponses.submittedAt,
    })
    .from(formAssignments)
    .innerJoin(forms, eq(forms.id, formAssignments.formId))
    .leftJoin(
      formResponses,
      eq(formResponses.assignmentId, formAssignments.id),
    )
    .where(eq(formAssignments.clientId, clientId))
    .orderBy(desc(formAssignments.createdAt))

  return rows.map((r) => ({
    assignment: r.assignment,
    form: r.form,
    response: r.responseId
      ? { id: r.responseId, submittedAt: r.responseSubmittedAt! }
      : null,
  }))
}

// One assignment + its form + the existing response (if submitted) for the
// fill page. Scoped to the calling client so a stolen UUID can't open a
// peer's form.
export async function getPortalAssignment(
  assignmentId: string,
  clientId: string,
): Promise<
  | {
      assignment: FormAssignment
      form: Form
      response: FormResponse | null
    }
  | null
> {
  const [row] = await dbAdmin
    .select({ assignment: formAssignments, form: forms })
    .from(formAssignments)
    .innerJoin(forms, eq(forms.id, formAssignments.formId))
    .where(
      and(
        eq(formAssignments.id, assignmentId),
        eq(formAssignments.clientId, clientId),
      ),
    )
    .limit(1)
  if (!row) return null

  const [response] = await dbAdmin
    .select()
    .from(formResponses)
    .where(eq(formResponses.assignmentId, assignmentId))
    .limit(1)

  return {
    assignment: row.assignment,
    form: row.form,
    response: response ?? null,
  }
}

// Documents shared with a client. The professional may upload general docs
// (`client_id IS NULL`) — those don't show in the portal; this query returns
// only rows directly attached to the client.
export async function getPortalDocuments(
  clientIds: string[],
): Promise<Document[]> {
  if (clientIds.length === 0) return []
  return dbAdmin
    .select()
    .from(documents)
    .where(inArray(documents.clientId, clientIds))
    .orderBy(desc(documents.createdAt))
}

// Sum of all `documents.fileSize` for a professional (in bytes). Used by
// `portalPrepareDocumentUpload` to enforce plan storage caps before minting
// a storage key.
export async function getPortalProfessionalStorageUsedBytes(
  professionalId: string,
): Promise<number> {
  const rows = await dbAdmin
    .select({
      total: sql<string>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
    })
    .from(documents)
    .where(eq(documents.professionalId, professionalId))
  const raw = rows[0]?.total ?? "0"
  return typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw)
}
