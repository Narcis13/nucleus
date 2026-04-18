// Plain constants module — imported by both server actions and client
// components. Lives outside `"use server"` files because Next 16 only lets
// those export async functions; exporting an array from there produces a
// server-action proxy instead of the value, which crashes at render time.
export const DOCUMENT_CATEGORIES = [
  "General",
  "Contract",
  "Identity",
  "Medical",
  "Financial",
  "Other",
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]
