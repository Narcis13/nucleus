"use client"

import { Plus, Send, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/lib/actions/invoices"
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceSettings,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <InvoiceBuilder>
//
// Shared create + edit surface. The draft-vs-sent distinction is a submit
// action, not a mode: the form always produces the same shape, and the user
// picks "Save draft" or "Save & send" at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

export type ClientChoice = { id: string; fullName: string; email: string }
export type AppointmentChoice = {
  id: string
  title: string
  startAtIso: string
}

type LineItemRow = InvoiceLineItem

type InvoiceBuilderProps = {
  initial?: Invoice | null
  defaultClientId?: string | null
  defaultAppointmentId?: string | null
  clients: ClientChoice[]
  appointments: AppointmentChoice[]
  settings: InvoiceSettings | null
  currency: string
  onDone?: (id?: string) => void
}

function blankLine(): LineItemRow {
  return { description: "", quantity: 1, unit_price: 0, amount: 0 }
}

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function InvoiceBuilder({
  initial,
  defaultClientId,
  defaultAppointmentId,
  clients,
  appointments,
  settings,
  currency,
  onDone,
}: InvoiceBuilderProps) {
  const isEdit = Boolean(initial)
  const defaultTerms = settings?.defaultTerms ?? "Net 30"
  const defaultDueDays = settings?.defaultDueDays ?? 30
  const defaultTax = Number(settings?.taxRate ?? 0)

  const [clientId, setClientId] = useState<string>(
    initial?.clientId ?? defaultClientId ?? clients[0]?.id ?? "",
  )
  const [appointmentId, setAppointmentId] = useState<string>(
    initial?.appointmentId ?? defaultAppointmentId ?? "",
  )
  const [issueDate, setIssueDate] = useState<string>(
    initial?.issueDate ?? isoDaysFromNow(0),
  )
  const [dueDate, setDueDate] = useState<string>(
    initial?.dueDate ?? isoDaysFromNow(defaultDueDays),
  )
  const [terms, setTerms] = useState<string>(initial?.terms ?? defaultTerms)
  const [notes, setNotes] = useState<string>(
    initial?.notes ?? settings?.defaultNotes ?? "",
  )
  const [taxRate, setTaxRate] = useState<number>(
    Number(initial?.taxRate ?? defaultTax),
  )
  const [discount, setDiscount] = useState<number>(
    Number(initial?.discount ?? 0),
  )
  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => {
    const seed = initial?.lineItems as LineItemRow[] | null | undefined
    if (seed && Array.isArray(seed) && seed.length > 0) {
      return seed.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unit_price: Number(li.unit_price) || 0,
        amount: Number(li.amount) || 0,
      }))
    }
    return [blankLine()]
  })

  const totals = useMemo(() => {
    const subtotal = round2(
      lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0),
    )
    const taxable = Math.max(0, subtotal - Number(discount || 0))
    const tax = round2((taxable * Number(taxRate || 0)) / 100)
    const total = round2(taxable + tax)
    return { subtotal, tax, total }
  }, [lineItems, taxRate, discount])

  const createAction = useAction(createInvoiceAction, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.invoiceNumber
          ? `Invoice ${data.invoiceNumber} created.`
          : "Invoice created.",
      )
      onDone?.(data?.id)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't create invoice.")
    },
  })

  const updateAction = useAction(updateInvoiceAction, {
    onSuccess: ({ data }) => {
      toast.success("Invoice saved.")
      onDone?.(data?.id)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save invoice.")
    },
  })

  const isPending = createAction.isExecuting || updateAction.isExecuting

  function updateLine(
    index: number,
    patch: Partial<LineItemRow>,
  ) {
    setLineItems((prev) => {
      const next = prev.slice()
      const current = next[index]
      if (!current) return prev
      const merged = { ...current, ...patch }
      merged.amount = round2(
        Number(merged.quantity || 0) * Number(merged.unit_price || 0),
      )
      next[index] = merged
      return next
    })
  }

  function addLine() {
    setLineItems((prev) => [...prev, blankLine()])
  }

  function removeLine(index: number) {
    setLineItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    )
  }

  function submit(status: "draft" | "sent") {
    if (!clientId) {
      toast.error("Pick a client first.")
      return
    }
    const cleaned = lineItems.filter((li) => li.description.trim().length > 0)
    if (cleaned.length === 0) {
      toast.error("Add at least one line item.")
      return
    }
    const payload = {
      clientId,
      appointmentId: appointmentId || undefined,
      lineItems: cleaned,
      taxRate: Number(taxRate) || 0,
      discount: Number(discount) || 0,
      currency,
      issueDate,
      dueDate,
      terms: terms || "Net 30",
      notes: notes || null,
      status,
    }
    if (isEdit && initial) {
      updateAction.execute({ id: initial.id, ...payload })
    } else {
      createAction.execute(payload)
    }
  }

  const money = (n: number) => formatCurrency(n, currency)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Client</Label>
          <Select
            value={clientId}
            onValueChange={(v) => setClientId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a client">
                {(value: string | null) => {
                  const c = value ? clients.find((c) => c.id === value) : null
                  return c ? `${c.fullName} · ${c.email}` : "Pick a client"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName} · {c.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Linked appointment (optional)</Label>
          <Select
            value={appointmentId || "none"}
            onValueChange={(v) => setAppointmentId(v === "none" || !v ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No appointment">
                {(value: string | null) => {
                  if (!value || value === "none") return "No appointment"
                  const a = appointments.find((a) => a.id === value)
                  return a
                    ? `${a.title} · ${new Date(a.startAtIso).toLocaleDateString()}`
                    : "No appointment"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No appointment</SelectItem>
              {appointments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title} · {new Date(a.startAtIso).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Issue date</Label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Due date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Terms</Label>
          <Input
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Net 30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Tax rate (%)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-right">Qty</TableHead>
              <TableHead className="w-32 text-right">Unit price</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((li, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    value={li.description}
                    onChange={(e) =>
                      updateLine(i, { description: e.target.value })
                    }
                    placeholder="Service or item"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="text-right"
                    value={li.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: Number(e.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="text-right"
                    value={li.unit_price}
                    onChange={(e) =>
                      updateLine(i, { unit_price: Number(e.target.value) })
                    }
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {money(li.amount)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(i)}
                    disabled={lineItems.length === 1}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-border p-2">
          <Button type="button" variant="ghost" size="sm" onClick={addLine}>
            <Plus className="size-4" /> Add line item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-1.5">
          <Label>Notes / message</Label>
          <Textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add payment instructions, thank-you note, etc."
          />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
          <TotalRow label="Subtotal" value={totals.subtotal} currency={currency} />
          <div className="flex items-center gap-2">
            <Label className="flex-1 text-sm text-muted-foreground">
              Discount
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              className="w-32 text-right"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <TotalRow
            label={`Tax (${taxRate || 0}%)`}
            value={totals.tax}
            currency={currency}
          />
          <div className="border-t border-border pt-2">
            <TotalRow
              label="Total"
              value={totals.total}
              currency={currency}
              emphasis
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => submit("draft")}
          disabled={isPending}
        >
          {isEdit ? "Save changes" : "Save draft"}
        </Button>
        <Button
          type="button"
          onClick={() => submit("sent")}
          disabled={isPending}
        >
          <Send className="size-4" /> Save &amp; send
        </Button>
      </div>
    </div>
  )
}

function TotalRow({
  label,
  value,
  currency,
  emphasis,
}: {
  label: string
  value: number
  currency: string
  emphasis?: boolean
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-center justify-between text-base font-semibold"
          : "flex items-center justify-between text-sm text-muted-foreground"
      }
    >
      <span>{label}</span>
      <span className={emphasis ? "text-foreground" : ""}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  )
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
