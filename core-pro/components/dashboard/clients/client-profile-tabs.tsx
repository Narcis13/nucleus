"use client"

import {
  ArrowUpRight,
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
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { MessageInput } from "@/components/shared/chat/message-input"
import { MessageThread } from "@/components/shared/chat/message-thread"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { updateClientAction } from "@/lib/actions/clients"
import { openClientConversationAction } from "@/lib/actions/messages"
import type { ActivityEntry } from "@/lib/db/queries/clients"
import type {
  Client,
  Document,
  FormAssignment,
  Invoice,
  Message,
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
  professionalId: string
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
  professionalId,
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
            <StatusOverviewCard
              clientId={client.id}
              status={relationship.status}
              source={relationship.source}
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
        <InlineConversation
          clientId={client.id}
          clientName={client.fullName}
          professionalId={professionalId}
        />
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
                    {inv.total} {inv.currency} · {inv.status}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.issueDate).toLocaleDateString()}
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

const STATUS_OPTIONS = ["active", "inactive", "archived"] as const

function StatusOverviewCard({
  clientId,
  status,
  source,
}: {
  clientId: string
  status: string
  source: string | null
}) {
  const [value, setValue] = useState(status)
  useEffect(() => {
    setValue(status)
  }, [status])

  const action = useAction(updateClientAction, {
    onSuccess: () => toast.success("Status updated."),
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update status.")
      setValue(status)
    },
  })

  const options = Array.from(new Set([...STATUS_OPTIONS, status]))

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        Status
      </p>
      <div className="mt-1">
        <Select
          value={value}
          onValueChange={(next) => {
            if (!next || next === value) return
            setValue(next)
            action.execute({ id: clientId, status: next })
          }}
          disabled={action.isExecuting}
        >
          <SelectTrigger size="sm" className="w-full capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {source ?? "No source"}
      </p>
    </div>
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

// Renders the chat surface in-place inside the client profile. Lazy: the
// conversation is only created/loaded when the Messages tab is actually
// viewed (the component mounts when the tab becomes active).
function InlineConversation({
  clientId,
  clientName,
  professionalId,
}: {
  clientId: string
  clientName: string
  professionalId: string
}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initial, setInitial] = useState<Message[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const { execute } = useAction(openClientConversationAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      setConversationId(data.conversationId)
      setInitial(
        data.messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderRole: m.senderRole,
          content: m.content,
          type: m.type,
          mediaUrl: m.mediaUrl,
          readAt: m.readAt ? new Date(m.readAt) : null,
          createdAt: new Date(m.createdAt),
        })),
      )
    },
    onError: ({ error }) => {
      const msg = error.serverError ?? "Couldn't open conversation."
      setLoadError(msg)
      toast.error(msg)
    },
  })

  useEffect(() => {
    execute({ clientId })
    // Only on mount / client change — the action itself is idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  if (loadError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {loadError}
      </div>
    )
  }

  if (!conversationId) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
        Loading conversation with {clientName}…
      </div>
    )
  }

  return (
    <div className="flex h-[min(70dvh,640px)] min-h-96 flex-col overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Realtime thread with {clientName}
        </p>
        <Button
          variant="ghost"
          size="xs"
          render={
            <Link href={`/dashboard/messages?c=${conversationId}`}>
              Open in inbox
              <ArrowUpRight className="size-3" />
            </Link>
          }
        />
      </div>
      <div className="flex-1 min-h-0">
        <MessageThread
          conversationId={conversationId}
          initial={initial}
          currentSenderId={professionalId}
          otherPartyLabel={clientName}
        />
      </div>
      <MessageInput
        conversationId={conversationId}
        owner={{ id: professionalId, role: "professional" }}
      />
    </div>
  )
}
