"use client"

import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { requestLeadMagnetAction } from "@/lib/actions/marketing"
import type { LeadMagnet } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <LeadMagnetForm>
//
// Inline form shown on the anonymous micro-site. Double opt-in: submission
// only mints a `lead_magnet_claims` row and emails the visitor a confirm
// link. The lead in the pro's pipeline is created when the visitor clicks
// the link in their inbox — fake/unreachable emails never get the PDF.
// ─────────────────────────────────────────────────────────────────────────────
export function LeadMagnetForm({
  slug,
  magnet,
}: {
  slug: string
  magnet: LeadMagnet
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const { execute, isPending } = useAction(requestLeadMagnetAction, {
    onSuccess: ({ data, input }) => {
      // Honeypot path returns `sent: false`. We still flip to the confirmation
      // view so a bot gets the same UX a human gets.
      setSubmittedEmail(input.email)
      if (data?.sent) {
        toast.success("Check your inbox to confirm and download.")
      }
      setFullName("")
      setEmail("")
      setPhone("")
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "Couldn't process your download — try again shortly.",
      )
    },
  })

  if (submittedEmail) {
    return (
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          backgroundColor: "var(--ms-primary)",
          color: "var(--ms-primary-fg)",
        }}
      >
        <p className="font-medium">Check your inbox.</p>
        <p className="mt-1 opacity-90">
          We sent a confirmation link to <strong>{submittedEmail}</strong>. Click
          it within 30 minutes to start the download.
        </p>
      </div>
    )
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        execute({
          slug,
          leadMagnetId: magnet.id,
          fullName,
          email,
          phone,
          website,
        })
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          Name
          <input
            required
            type="text"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-10 px-3 text-sm"
            style={{
              backgroundColor: "var(--ms-bg)",
              color: "var(--ms-fg)",
              border: "1px solid var(--ms-border)",
              borderRadius: "calc(var(--ms-radius) / 2)",
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Email
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 px-3 text-sm"
            style={{
              backgroundColor: "var(--ms-bg)",
              color: "var(--ms-fg)",
              border: "1px solid var(--ms-border)",
              borderRadius: "calc(var(--ms-radius) / 2)",
            }}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        Phone (optional)
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-10 px-3 text-sm"
          style={{
            backgroundColor: "var(--ms-bg)",
            color: "var(--ms-fg)",
            border: "1px solid var(--ms-border)",
            borderRadius: "calc(var(--ms-radius) / 2)",
          }}
        />
      </label>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center px-5 text-sm font-medium disabled:opacity-70"
        style={{
          backgroundColor: "var(--ms-primary)",
          color: "var(--ms-primary-fg)",
          borderRadius: "var(--ms-radius)",
          boxShadow: "var(--ms-shadow)",
        }}
      >
        {isPending ? "Preparing…" : "Download"}
      </button>
    </form>
  )
}
