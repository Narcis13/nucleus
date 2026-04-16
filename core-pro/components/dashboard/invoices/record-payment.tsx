"use client"

import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { recordPaymentAction } from "@/lib/actions/invoices"
import type { Invoice } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <RecordPayment>
//
// Dialog that captures a single payment against an invoice. Pre-populates the
// amount to the outstanding balance so the common case is a one-click full
// payment; partial payments are supported by typing a smaller number.
// ─────────────────────────────────────────────────────────────────────────────

type RecordPaymentProps = {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecorded?: () => void
}

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "credit_card", label: "Credit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
] as const

export function RecordPayment({
  invoice,
  open,
  onOpenChange,
  onRecorded,
}: RecordPaymentProps) {
  const balance = Math.max(
    0,
    Number(invoice.total) - Number(invoice.paidAmount),
  )
  const [amount, setAmount] = useState<number>(balance)
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>(
    "cash",
  )
  const [reference, setReference] = useState("")
  const [paidDate, setPaidDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )

  const action = useAction(recordPaymentAction, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.status === "paid"
          ? "Invoice marked paid. Receipt sent."
          : "Payment recorded.",
      )
      onOpenChange(false)
      onRecorded?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't record payment.")
    },
  })

  function submit() {
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than zero.")
      return
    }
    action.execute({
      id: invoice.id,
      amount,
      method,
      reference: reference.trim() || undefined,
      paidDate,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment · {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Balance due: {formatCurrency(balance, invoice.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Amount received</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Payment method</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as typeof method)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Reference (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, txn id, memo…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Paid on</Label>
            <Input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={action.isExecuting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={action.isExecuting}>
            {action.isExecuting ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
