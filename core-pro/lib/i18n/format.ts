// Formatting helpers that wrap the platform Intl APIs with sensible defaults.
// These work on both the server and client (no `server-only` marker) because
// emails, PDFs, and micro-sites can all reach for the same utilities.

import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeLocale,
  type Locale,
} from "./config"

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(
  value: DateInput,
  options: {
    locale?: Locale | string
    timezone?: string
    style?: "short" | "medium" | "long" | "full"
  } = {},
): string {
  const locale = normalizeLocale(options.locale ?? DEFAULT_LOCALE)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: options.style ?? "medium",
    timeZone: options.timezone ?? DEFAULT_TIMEZONE,
  }).format(toDate(value))
}

export function formatDateTime(
  value: DateInput,
  options: {
    locale?: Locale | string
    timezone?: string
  } = {},
): string {
  const locale = normalizeLocale(options.locale ?? DEFAULT_LOCALE)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: options.timezone ?? DEFAULT_TIMEZONE,
  }).format(toDate(value))
}

export function formatTime(
  value: DateInput,
  options: {
    locale?: Locale | string
    timezone?: string
  } = {},
): string {
  const locale = normalizeLocale(options.locale ?? DEFAULT_LOCALE)
  return new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
    timeZone: options.timezone ?? DEFAULT_TIMEZONE,
  }).format(toDate(value))
}

// Money values live in the professional's `currency` column. Default to EUR
// when the caller doesn't know — the formatter will still render a sensible
// symbol, and any currency-agnostic totals (e.g. counters) should reach for
// `formatNumber` instead.
export function formatCurrency(
  amount: number,
  options: {
    locale?: Locale | string
    currency?: string
  } = {},
): string {
  const locale = normalizeLocale(options.locale ?? DEFAULT_LOCALE)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: options.currency ?? DEFAULT_CURRENCY,
  }).format(amount)
}

export function formatNumber(
  value: number,
  options: {
    locale?: Locale | string
    maximumFractionDigits?: number
  } = {},
): string {
  const locale = normalizeLocale(options.locale ?? DEFAULT_LOCALE)
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value)
}

// Invoice amounts are stored as integer cents. Every caller was converting
// the same way — centralise it so a /100 never drifts.
export function formatMoneyCents(
  cents: number,
  options: {
    locale?: Locale | string
    currency?: string
  } = {},
): string {
  return formatCurrency(cents / 100, options)
}
