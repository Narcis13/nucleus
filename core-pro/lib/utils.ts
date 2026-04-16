import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────────────────────────────────────
// Money / dates / display helpers — used everywhere in the UI.
// ─────────────────────────────────────────────────────────────────────────────
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "EUR",
  locale: string = "ro-RO",
): string {
  if (amount === null || amount === undefined || amount === "") return "—"
  const value = typeof amount === "string" ? Number(amount) : amount
  if (Number.isNaN(value)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: string = "ro-RO",
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: string = "ro-RO",
): string {
  return formatDate(date, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?"
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
