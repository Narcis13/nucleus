"use client"

import {
  Check,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteInvoiceAction,
  sendInvoiceAction,
} from "@/lib/actions/invoices"
import type { InvoiceListItem } from "@/lib/db/queries/invoices"
import type { Invoice, InvoiceSettings } from "@/types/domain"

import {
  InvoiceBuilder,
  type AppointmentChoice,
  type ClientChoice,
} from "./invoice-builder"
import { RecordPayment } from "./record-payment"

// ─────────────────────────────────────────────────────────────────────────────
// <InvoiceList>
//
// Tabbed list of the professional's invoices with an inline "New invoice"
// dialog. Filter tabs mirror the statuses the spec calls out: all, draft,
// sent, overdue, paid (plus "outstanding" as a convenience union). The row
// menu exposes edit / send / record-payment / delete.
// ─────────────────────────────────────────────────────────────────────────────

type Filter = "all" | "draft" | "sent" | "overdue" | "paid"

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
]

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  viewed: { label: "Viewed", variant: "secondary" },
  partial: { label: "Partial", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
  void: { label: "Void", variant: "outline" },
}

type InvoiceListProps = {
  initial: InvoiceListItem[]
  clients: ClientChoice[]
  appointments: AppointmentChoice[]
  settings: InvoiceSettings | null
  currency: string
}

export function InvoiceList({
  initial,
  clients,
  appointments,
  settings,
  currency,
}: InvoiceListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)

  const rows = useMemo(() => {
    if (filter === "all") return initial
    if (filter === "sent") {
      // "Sent" group shows everything that's out in the world but not paid.
      return initial.filter((r) =>
        ["sent", "viewed", "partial"].includes(r.invoice.status),
      )
    }
    return initial.filter((r) => r.invoice.status === filter)
  }, [initial, filter])

  const sendAction = useAction(sendInvoiceAction, {
    onSuccess: () => {
      toast.success("Invoice sent.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't send invoice.")
    },
  })

  const deleteAction = useAction(deleteInvoiceAction, {
    onSuccess: () => {
      toast.success("Invoice deleted.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete invoice.")
    },
  })

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <FileText className="size-4" /> New invoice
              </Button>
            }
          />
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>New invoice</DialogTitle>
              <DialogDescription>
                Add line items, set the due date, and save as draft or send now.
              </DialogDescription>
            </DialogHeader>
            <InvoiceBuilder
              clients={clients}
              appointments={appointments}
              settings={settings}
              currency={currency}
              onDone={() => {
                setCreateOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-sm text-muted-foreground"
                >
                  No invoices here yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const inv = row.invoice
                const statusMeta = STATUS_BADGE[inv.status] ?? {
                  label: inv.status,
                  variant: "outline" as const,
                }
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {row.client ? (
                        <div>
                          <div>{row.client.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.client.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMeta.variant}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.issueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(inv.total), inv.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(
                        Number(inv.paidAmount),
                        inv.currency,
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Invoice actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingInvoice(inv)}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          {inv.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() =>
                                sendAction.execute({ id: inv.id })
                              }
                            >
                              <Send className="size-4" /> Send invoice
                            </DropdownMenuItem>
                          )}
                          {inv.status !== "paid" &&
                            inv.status !== "draft" &&
                            inv.status !== "void" && (
                              <DropdownMenuItem
                                onClick={() => setPaymentInvoice(inv)}
                              >
                                <Check className="size-4" /> Record payment
                              </DropdownMenuItem>
                            )}
                          {inv.status === "sent" && (
                            <DropdownMenuItem
                              onClick={() =>
                                toast.message(
                                  "Ask the client to open the invoice in the portal to mark it viewed.",
                                )
                              }
                            >
                              <Eye className="size-4" /> Preview only
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              deleteAction.execute({ id: inv.id })
                            }
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingInvoice && (
        <Dialog
          open
          onOpenChange={(next) => !next && setEditingInvoice(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Edit invoice {editingInvoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription>
                Draft invoices can be edited freely. Sent invoices keep the
                number and issue date; you can still fix totals until the first
                payment is recorded.
              </DialogDescription>
            </DialogHeader>
            <InvoiceBuilder
              initial={editingInvoice}
              clients={clients}
              appointments={appointments}
              settings={settings}
              currency={currency}
              onDone={() => {
                setEditingInvoice(null)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {paymentInvoice && (
        <RecordPayment
          invoice={paymentInvoice}
          open
          onOpenChange={(next) => !next && setPaymentInvoice(null)}
          onRecorded={() => router.refresh()}
        />
      )}
    </>
  )
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}
