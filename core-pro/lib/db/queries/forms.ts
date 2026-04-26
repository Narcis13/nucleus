import "server-only"

import { createHash } from "node:crypto"

import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  clients,
  formAssignments,
  formPublicShares,
  formResponses,
  forms,
} from "@/lib/db/schema"
import type {
  Client,
  Form,
  FormAssignment,
  FormPublicShare,
  FormResponse,
} from "@/types/domain"
import type { FormResponseData, FormSchema } from "@/types/forms"

import { getProfessional } from "./professionals"

// ─────────────────────────────────────────────────────────────────────────────
// FORMS — author side (professional)
// ─────────────────────────────────────────────────────────────────────────────
export async function getForms(): Promise<Form[]> {
  return withRLS(async (tx) => {
    return tx
      .select()
      .from(forms)
      .where(eq(forms.isActive, true))
      .orderBy(desc(forms.createdAt))
  })
}

export async function getForm(id: string): Promise<Form | null> {
  return withRLS(async (tx) => {
    const rows = await tx.select().from(forms).where(eq(forms.id, id)).limit(1)
    return rows[0] ?? null
  })
}

export async function createForm(input: {
  title: string
  description?: string | null
  schema: FormSchema
}): Promise<Form> {
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(forms)
      .values({
        professionalId: professional.id,
        title: input.title,
        description: input.description ?? null,
        schema: input.schema,
      })
      .returning()
    if (!created) throw new Error("Failed to insert form")
    return created
  })
}

export async function updateForm(
  id: string,
  patch: Partial<{
    title: string
    description: string | null
    schema: FormSchema
    isActive: boolean
  }>,
): Promise<Form | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .update(forms)
      .set(patch)
      .where(eq(forms.id, id))
      .returning()
    return rows[0] ?? null
  })
}

export async function archiveForm(id: string): Promise<Form | null> {
  return updateForm(id, { isActive: false })
}

// Form + its assignments + its responses for the professional's overview page.
// Responses are immutable submissions; assignments may be pending or completed.
export async function getFormDetail(id: string): Promise<
  | {
      form: Form
      assignments: Array<FormAssignment & { client: Pick<Client, "id" | "fullName" | "email"> | null }>
      responses: Array<FormResponse & { client: Pick<Client, "id" | "fullName"> | null }>
    }
  | null
> {
  return withRLS(async (tx) => {
    const [form] = await tx.select().from(forms).where(eq(forms.id, id)).limit(1)
    if (!form) return null

    const assignmentRows = await tx
      .select({
        assignment: formAssignments,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
        },
      })
      .from(formAssignments)
      .leftJoin(clients, eq(clients.id, formAssignments.clientId))
      .where(eq(formAssignments.formId, id))
      .orderBy(desc(formAssignments.createdAt))

    const responseRows = await tx
      .select({
        response: formResponses,
        client: {
          id: clients.id,
          fullName: clients.fullName,
        },
      })
      .from(formResponses)
      .leftJoin(clients, eq(clients.id, formResponses.clientId))
      .where(eq(formResponses.formId, id))
      .orderBy(desc(formResponses.submittedAt))

    return {
      form,
      assignments: assignmentRows.map((r) => ({
        ...r.assignment,
        client: r.client?.id ? r.client : null,
      })),
      responses: responseRows.map((r) => ({
        ...r.response,
        client: r.client?.id ? r.client : null,
      })),
    }
  })
}

// Counts per form — used by the list page to show "N responses / M pending".
export async function getFormCounts(): Promise<
  Record<string, { assignments: number; pending: number; responses: number }>
> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        formId: forms.id,
        assignments: sql<number>`(
          select count(*)::int from public.form_assignments fa
          where fa.form_id = ${forms.id}
        )`,
        pending: sql<number>`(
          select count(*)::int from public.form_assignments fa
          where fa.form_id = ${forms.id} and fa.status = 'pending'
        )`,
        responses: sql<number>`(
          select count(*)::int from public.form_responses fr
          where fr.form_id = ${forms.id}
        )`,
      })
      .from(forms)
    const result: Record<
      string,
      { assignments: number; pending: number; responses: number }
    > = {}
    for (const r of rows) {
      result[r.formId] = {
        assignments: r.assignments,
        pending: r.pending,
        responses: r.responses,
      }
    }
    return result
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS — link forms to clients
// ─────────────────────────────────────────────────────────────────────────────
export async function assignFormToClients(
  formId: string,
  clientIds: string[],
  dueDate?: Date | null,
): Promise<FormAssignment[]> {
  if (clientIds.length === 0) return []
  const professional = await getProfessional()
  if (!professional) throw new Error("No professional context")
  return withRLS(async (tx) => {
    const rows = await tx
      .insert(formAssignments)
      .values(
        clientIds.map((clientId) => ({
          formId,
          clientId,
          professionalId: professional.id,
          dueDate: dueDate ?? null,
        })),
      )
      .returning()
    return rows
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL (client side) — list and fill
// ─────────────────────────────────────────────────────────────────────────────

// Restricts the portal queries to assignments where the current user is
// actually the client (matched via clerk_user_id). RLS allows professionals
// to also see their own clients' assignments here, so without this filter
// professionals visiting /portal/forms would see (and fail to submit) their
// clients' forms.
const currentClientIdsSql = sql`(select id from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub'))`

export async function getClientAssignments(): Promise<
  Array<{
    assignment: FormAssignment
    form: Form
    response: Pick<FormResponse, "id" | "submittedAt"> | null
  }>
> {
  return withRLS(async (tx) => {
    const rows = await tx
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
      .where(sql`${formAssignments.clientId} in ${currentClientIdsSql}`)
      .orderBy(desc(formAssignments.createdAt))

    return rows.map((r) => ({
      assignment: r.assignment,
      form: r.form,
      response: r.responseId
        ? { id: r.responseId, submittedAt: r.responseSubmittedAt! }
        : null,
    }))
  })
}

// Loads a single assignment + form for the fill page. Restricts to the
// current client (same reason as getClientAssignments above).
export async function getClientAssignment(
  assignmentId: string,
): Promise<
  | {
      assignment: FormAssignment
      form: Form
      response: FormResponse | null
    }
  | null
> {
  return withRLS(async (tx) => {
    const [row] = await tx
      .select({
        assignment: formAssignments,
        form: forms,
      })
      .from(formAssignments)
      .innerJoin(forms, eq(forms.id, formAssignments.formId))
      .where(
        and(
          eq(formAssignments.id, assignmentId),
          sql`${formAssignments.clientId} in ${currentClientIdsSql}`,
        ),
      )
      .limit(1)
    if (!row) return null

    const [response] = await tx
      .select()
      .from(formResponses)
      .where(eq(formResponses.assignmentId, assignmentId))
      .limit(1)

    return {
      assignment: row.assignment,
      form: row.form,
      response: response ?? null,
    }
  })
}

// Insert a response + flip the assignment to "completed" in a single tx so
// the portal's list can show the submitted state without a second round trip.
export async function submitFormResponse(args: {
  assignmentId: string
  clientId: string
  formId: string
  data: FormResponseData
}): Promise<FormResponse> {
  return withRLS(async (tx) => {
    const [created] = await tx
      .insert(formResponses)
      .values({
        assignmentId: args.assignmentId,
        clientId: args.clientId,
        formId: args.formId,
        data: args.data,
      })
      .returning()
    if (!created) throw new Error("Failed to insert form response")
    await tx
      .update(formAssignments)
      .set({ status: "completed" })
      .where(eq(formAssignments.id, args.assignmentId))
    return created
  })
}

// For the professional's response-detail drawer — a single response with its
// client. RLS on `form_responses` already gates access via the form's owner.
export async function getFormResponse(
  id: string,
): Promise<
  | {
      response: FormResponse
      client: Pick<Client, "id" | "fullName" | "email" | "avatarUrl"> | null
      form: Form
    }
  | null
> {
  return withRLS(async (tx) => {
    const [row] = await tx
      .select({
        response: formResponses,
        form: forms,
        client: {
          id: clients.id,
          fullName: clients.fullName,
          email: clients.email,
          avatarUrl: clients.avatarUrl,
        },
      })
      .from(formResponses)
      .innerJoin(forms, eq(forms.id, formResponses.formId))
      .leftJoin(clients, eq(clients.id, formResponses.clientId))
      .where(eq(formResponses.id, id))
      .limit(1)
    if (!row) return null
    return {
      response: row.response,
      form: row.form,
      client: row.client?.id ? row.client : null,
    }
  })
}

// Used by the bulk-assign dropdown to avoid re-assigning a form to a client
// who already has an open assignment.
export async function getExistingAssignmentsForClients(
  formId: string,
  clientIds: string[],
): Promise<Set<string>> {
  if (clientIds.length === 0) return new Set()
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ clientId: formAssignments.clientId })
      .from(formAssignments)
      .where(
        and(
          eq(formAssignments.formId, formId),
          inArray(formAssignments.clientId, clientIds),
          // Don't block re-assignment when the previous one is completed.
          eq(formAssignments.status, "pending"),
        ),
      )
    return new Set(rows.map((r) => r.clientId))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SHARES
// ─────────────────────────────────────────────────────────────────────────────

// Listed under the form's edit page so the pro can see active links and
// revoke them. Joins the subject client (e.g. property owner) for display.
// `tokenHash` (bytea / Uint8Array) is omitted — it isn't serializable across
// the RSC → Client Component boundary, and the UI never needs it.
export async function getFormPublicShares(formId: string): Promise<
  Array<
    Omit<FormPublicShare, "tokenHash"> & {
      subjectClient: Pick<Client, "id" | "fullName"> | null
    }
  >
> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({
        id: formPublicShares.id,
        formId: formPublicShares.formId,
        professionalId: formPublicShares.professionalId,
        subjectClientId: formPublicShares.subjectClientId,
        subjectAppointmentId: formPublicShares.subjectAppointmentId,
        maxResponses: formPublicShares.maxResponses,
        responseCount: formPublicShares.responseCount,
        expiresAt: formPublicShares.expiresAt,
        revokedAt: formPublicShares.revokedAt,
        createdAt: formPublicShares.createdAt,
        subjectClient: {
          id: clients.id,
          fullName: clients.fullName,
        },
      })
      .from(formPublicShares)
      .leftJoin(clients, eq(clients.id, formPublicShares.subjectClientId))
      .where(eq(formPublicShares.formId, formId))
      .orderBy(desc(formPublicShares.createdAt))
    return rows.map((r) => ({
      ...r,
      subjectClient: r.subjectClient?.id ? r.subjectClient : null,
    }))
  })
}

// Server-side resolution of a raw share token to its share + form. Used by
// the public /share/[token] page; the token comes from the URL. We return
// the row even if revoked/expired/exhausted so the caller can render an
// informative error page (vs a generic 404).
export async function resolvePublicShareByToken(token: string): Promise<
  | {
      share: FormPublicShare
      form: Form
    }
  | null
> {
  const tokenHash = createHash("sha256").update(token).digest()
  const rows = await dbAdmin
    .select({
      share: formPublicShares,
      form: forms,
    })
    .from(formPublicShares)
    .innerJoin(forms, eq(forms.id, formPublicShares.formId))
    .where(eq(formPublicShares.tokenHash, tokenHash))
    .limit(1)
  return rows[0] ?? null
}

// Owner-side: surveys submitted *about* this client (e.g. apartment owner
// reading what viewers said). Uses dbAdmin since portal sessions don't
// satisfy Clerk-JWT-based RLS — the explicit clientId filter takes the
// place of the policy on this surface.
export async function getResponsesAboutClient(clientId: string): Promise<
  Array<{
    response: FormResponse
    form: Pick<Form, "id" | "title" | "description" | "schema">
  }>
> {
  const rows = await dbAdmin
    .select({
      response: formResponses,
      form: {
        id: forms.id,
        title: forms.title,
        description: forms.description,
        schema: forms.schema,
      },
    })
    .from(formResponses)
    .innerJoin(forms, eq(forms.id, formResponses.formId))
    .where(eq(formResponses.subjectClientId, clientId))
    .orderBy(desc(formResponses.submittedAt))
  return rows
}
