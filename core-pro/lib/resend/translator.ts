import "server-only"

import enMessages from "@/messages/en.json"
import roMessages from "@/messages/ro.json"

import {
  DEFAULT_LOCALE,
  type Locale,
  normalizeLocale,
} from "@/lib/i18n/config"

// ─────────────────────────────────────────────────────────────────────────────
// Email-specific translator.
//
// React-email templates render synchronously during `Resend.emails.send`, so
// we can't reach for `getTranslations()` (which expects a Next request scope).
// Instead, we bundle both message files at module load and expose a tiny
// substitution-based `t(key, params)` helper. Keys are dot-paths into the
// JSON — this keeps authors writing the same key shape used on the web side.
// ─────────────────────────────────────────────────────────────────────────────

type MessageTree = {
  [key: string]: string | MessageTree
}

const MESSAGES: Record<Locale, MessageTree> = {
  ro: roMessages as MessageTree,
  en: enMessages as MessageTree,
}

export type EmailTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string

function resolve(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".")
  let node: MessageTree | string | undefined = tree
  for (const part of parts) {
    if (typeof node === "string" || node === undefined) return undefined
    node = node[part]
  }
  return typeof node === "string" ? node : undefined
}

function interpolate(
  template: string,
  params: Record<string, string | number> | undefined,
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    const v = params[token]
    return v === undefined ? `{${token}}` : String(v)
  })
}

export function makeEmailTranslator(locale?: string | null): EmailTranslator {
  const resolved: Locale = normalizeLocale(locale ?? DEFAULT_LOCALE)
  const primary = MESSAGES[resolved]
  const fallback = MESSAGES[DEFAULT_LOCALE]
  return (key, params) => {
    const v = resolve(primary, key) ?? resolve(fallback, key) ?? key
    return interpolate(v, params)
  }
}
