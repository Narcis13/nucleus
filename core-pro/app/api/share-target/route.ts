import { redirect } from "next/navigation"
import { NextResponse, type NextRequest } from "next/server"

// ─────────────────────────────────────────────────────────────────────────────
// Web Share Target handler
//
// The installed PWA advertises this route in its manifest
// (`share_target.action`). When a user shares content from another app
// ("Share → CorePro") the OS POSTs a multipart form to this endpoint with
// any combination of title, text, url, and files.
//
// We intentionally don't do heavy lifting here — just normalise the input
// into querystring params and redirect into the dashboard's new-lead flow.
// That flow already has auth, validation, and file-upload affordances, and
// redirecting keeps the URL bar clean if the user backs out.
//
// File uploads from the share sheet are kept in memory via sessionStorage
// on the client — this route surfaces a hint (`files=N`) so the destination
// page can show an empty file-picker hint until the user taps through. We
// stop short of persisting the binary here because the share sheet user
// may not be authenticated on this device yet.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || ""
  let title = ""
  let text = ""
  let url = ""
  let fileCount = 0

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    title = form.get("title")?.toString() ?? ""
    text = form.get("text")?.toString() ?? ""
    url = form.get("url")?.toString() ?? ""
    fileCount = form.getAll("file").length
  } else {
    const params = await req.formData().catch(() => null)
    if (params) {
      title = params.get("title")?.toString() ?? ""
      text = params.get("text")?.toString() ?? ""
      url = params.get("url")?.toString() ?? ""
    }
  }

  const search = new URLSearchParams()
  search.set("source", "share")
  if (title) search.set("title", title)
  if (text) search.set("notes", text)
  if (url) search.set("url", url)
  if (fileCount > 0) search.set("files", String(fileCount))

  redirect(`/dashboard/leads?new=1&${search.toString()}`)
}

// Allow GET as a safety net — iOS Safari will sometimes send the share as a
// GET with query params. Mirror the POST handling so the result is identical.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const out = new URLSearchParams({ source: "share" })
  const title = searchParams.get("title")
  const text = searchParams.get("text")
  const url = searchParams.get("url")
  if (title) out.set("title", title)
  if (text) out.set("notes", text)
  if (url) out.set("url", url)
  return NextResponse.redirect(
    new URL(`/dashboard/leads?new=1&${out.toString()}`, req.url),
  )
}
