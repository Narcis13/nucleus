import "server-only"

import { upsertInvoiceSettings as upsertInvoiceSettingsQuery } from "@/lib/db/queries/invoices"

import type { ServiceContext } from "../_lib/context"
import { asNumericString } from "./_totals"

export type SaveInvoiceSettingsInput = {
  invoicePrefix?: string
  defaultDueDays?: number
  defaultTerms?: string
  defaultNotes?: string | null
  taxRate?: number
  logoUrl?: string | null
  companyInfo?: {
    name?: string
    address?: string
    city?: string
    postal_code?: string
    country?: string
    phone?: string
    email?: string
    website?: string
    tax_id?: string
  }
}

export type SaveInvoiceSettingsResult = { ok: true }

export async function saveInvoiceSettings(
  _ctx: ServiceContext,
  input: SaveInvoiceSettingsInput,
): Promise<SaveInvoiceSettingsResult> {
  const patch: Record<string, unknown> = {}
  if (input.invoicePrefix !== undefined) patch.invoicePrefix = input.invoicePrefix
  if (input.defaultDueDays !== undefined) patch.defaultDueDays = input.defaultDueDays
  if (input.defaultTerms !== undefined) patch.defaultTerms = input.defaultTerms
  if (input.defaultNotes !== undefined) patch.defaultNotes = input.defaultNotes
  if (input.taxRate !== undefined) patch.taxRate = asNumericString(input.taxRate)
  if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl
  if (input.companyInfo !== undefined) patch.companyInfo = input.companyInfo

  await upsertInvoiceSettingsQuery(patch)
  return { ok: true }
}
