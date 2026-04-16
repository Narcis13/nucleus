"use client"

import {
  ClipboardList,
  FileText,
  MessageSquare,
  NotebookPen,
  Receipt,
  Sparkles,
  User,
  UserCircle,
} from "lucide-react"
import Link from "next/link"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { updateClientAction } from "@/lib/actions/clients"
import type { ActivityEntry } from "@/lib/db/queries/clients"
import type {
  Client,
  Document,
  FormAssignment,
  Invoice,
  ProfessionalClient,
  Tag,
} from "@/types/domain"

import { DocumentList } from "@/components/shared/documents/document-list"
import { DocumentUpload } from "@/components/shared/documents/document-upload"

import { ActivityTimeline } from "./activity-timeline"
import { ClientForm } from "./client-form"
import { TagManager } from "./tag-manager"

// ─────────────────────────────────────────────────────────────────────────────
// <ClientProfileTabs>
//
// Main surface for the client profile page. Pure client-component so tabs can
// hold their state without navigation. Data is passed in from the RSC page
// (all queries are already RLS-scoped there).
//
// Tab layout:
//   overview — key stats + activity timeline + quick notes
//   details  — full client form for editing
//   messages — placeholder (full surface lives under /dashboard/messages)
//   documents, forms, invoices — scoped lists
//   notes    — internal notes on the relationship (not visible to client)
//   niche    — extension point for vertical-specific tabs
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  client: Client
  relationship: ProfessionalClient
  assignedTags: Tag[]
  allTags: Tag[]
  activity: ActivityEntry[]
  documents: Document[]
  forms: FormAssignment[]
  invoices: Invoice[]
}

export function ClientProfileTabs({
  client,
  relationship,
  assignedTags,
  allTags,
  activity,
  documents,
  forms,
  invoices,
}: Props) {
  return (
    <Tabs defaultValue="overview" className="flex w-full flex-col gap-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">
          <UserCircle className="size-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="details">
          <User className="size-3.5" />
          Details
        </TabsTrigger>
        <TabsTrigger value="messages">
          <MessageSquare className="size-3.5" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="documents">
          <FileText className="size-3.5" />
          Documents
        </TabsTrigger>
        <TabsTrigger value="forms">
          <ClipboardList className="size-3.5" />
          Forms
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <Receipt className="size-3.5" />
          Invoices
        </TabsTrigger>
        <TabsTrigger value="notes">
          <NotebookPen className="size-3.5" />
          Notes
        </TabsTrigger>
        <TabsTrigger value="niche">
          <Sparkles className="size-3.5" />
          Niche
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Tags
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Use tags to group clients for filters, bulk actions and
                automations.
              </p>
              <TagManager
                clientId={client.id}
                assignedTags={assignedTags}
                allTags={allTags}
              />
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">
                Recent activity
              </h2>
              <ActivityTimeline entries={activity.slice(0, 15)} />
            </div>
          </div>
          <aside className="flex flex-col gap-4">
            <OverviewCard
              label="Status"
              value={relationship.status}
              sub={relationship.source ?? "No source"}
            />
            <OverviewCard
              label="Started"
              value={relationship.startDate}
              sub={`${activity.length} activity events`}
            />
            <OverviewCard
              label="Contact"
              value={client.email}
              sub={client.phone ?? "No phone on file"}
            />
          </aside>
        </section>
      </TabsContent>

      <TabsContent value="details" className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-4">
          <ClientForm
            initialValues={{
              id: client.id,
              fullName: client.fullName,
              email: client.email,
              phone: client.phone ?? "",
              dateOfBirth: client.dateOfBirth ?? "",
              locale: client.locale,
              source: relationship.source ?? "",
            }}
            submitLabel="Save changes"
          />
        </div>
      </TabsContent>

      <TabsContent value="messages" className="flex flex-col gap-4">
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          The full chat lives in{" "}
          <Link
            href="/dashboard/messages"
            className="text-primary underline-offset-4 hover:underline"
          >
            /dashboard/messages
          </Link>
          . Realtime conversation inlined here in SESSION 10.
        </div>
      </TabsContent>

      <TabsContent value="documents" className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-card p-4">
          <DocumentUpload mode="professional" clientId={client.id} />
        </div>
        <DocumentList
          documents={documents}
          mode="professional"
          emptyState={<EmptyTab label="No documents yet" />}
        />
      </TabsContent>

      <TabsContent value="forms" className="flex flex-col gap-2">
        {forms.length === 0 ? (
          <EmptyTab label="No forms assigned" />
        ) : (
          <ul className="flex flex-col gap-2">
            {forms.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">Form assignment</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {f.status}
                    {f.dueDate
                      ? ` · due ${new Date(f.dueDate).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="invoices" className="flex flex-col gap-2">
        {invoices.length === 0 ? (
          <EmptyTab label="No invoices yet" />
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.amount} {inv.currency} · {inv.status}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.issuedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="notes" className="flex flex-col gap-4">
        <NotesEditor clientId={client.id} initial={relationship.notes} />
      </TabsContent>

      <TabsContent value="niche" className="flex flex-col gap-2">
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Niche-specific content slots here (programs, properties, meal plans,
          etc.) depending on the active vertical build.
        </div>
      </TabsContent>
    </Tabs>
  )
}

function OverviewCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | null | undefined
  sub?: string | null
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {value || "—"}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function NotesEditor({
  clientId,
  initial,
}: {
  clientId: string
  initial: string | null
}) {
  const [value, setValue] = useState(initial ?? "")
  const [dirty, setDirty] = useState(false)
  const action = useAction(updateClientAction, {
    onSuccess: () => {
      toast.success("Notes saved.")
      setDirty(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save notes.")
    },
  })
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-2 text-sm text-muted-foreground">
        Internal notes — not visible to the client.
      </p>
      <Textarea
        value={value}
        rows={8}
        onChange={(e) => {
          setValue(e.target.value)
          setDirty(true)
        }}
      />
      <div className="mt-3 flex justify-end">
        <Button
          disabled={!dirty || action.isExecuting}
          onClick={() => action.execute({ id: clientId, notes: value })}
        >
          {action.isExecuting ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  )
}
