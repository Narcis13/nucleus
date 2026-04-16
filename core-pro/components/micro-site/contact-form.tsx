"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { submitContactFormAction } from "@/lib/actions/micro-sites"
import type { MicroSiteContactSection } from "@/types/domain"

// Public contact form — renders on the anonymous micro-site and posts to
// `submitContactFormAction`. On success we collapse the fields and swap to a
// short confirmation so bots can't resubmit a dozen leads in a row.
export function ContactForm({
  section,
  slug,
}: {
  section: MicroSiteContactSection
  slug: string
}) {
  const [submitted, setSubmitted] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  // Honeypot field — real users never touch it; bots fill everything.
  const [website, setWebsite] = useState("")

  const { execute, isPending, result } = useAction(submitContactFormAction, {
    onSuccess: () => {
      setSubmitted(true)
      toast.success("Thanks — your message is on its way.")
      setFullName("")
      setEmail("")
      setPhone("")
      setMessage("")
      setWebsite("")
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "Couldn't send your message — try again in a moment.",
      )
    },
  })

  if (!section.enabled) return null

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center gap-2 p-8 text-center"
        style={{
          backgroundColor: "var(--ms-surface)",
          border: "1px solid var(--ms-border)",
          borderRadius: "var(--ms-radius)",
          boxShadow: "var(--ms-shadow)",
        }}
      >
        <h3 className="text-xl font-semibold">Message received</h3>
        <p style={{ color: "var(--ms-muted)" }}>
          I&rsquo;ll follow up from {section.email || "my inbox"} shortly.
        </p>
      </div>
    )
  }

  return (
    <form
      className="space-y-4 p-6"
      style={{
        backgroundColor: "var(--ms-surface)",
        border: "1px solid var(--ms-border)",
        borderRadius: "var(--ms-radius)",
        boxShadow: "var(--ms-shadow)",
      }}
      onSubmit={(e) => {
        e.preventDefault()
        execute({ slug, fullName, email, phone, message, website })
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Your name
          <input
            required
            type="text"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-10 px-3 text-base"
            style={{
              backgroundColor: "var(--ms-bg)",
              color: "var(--ms-fg)",
              border: "1px solid var(--ms-border)",
              borderRadius: "calc(var(--ms-radius) / 2)",
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 px-3 text-base"
            style={{
              backgroundColor: "var(--ms-bg)",
              color: "var(--ms-fg)",
              border: "1px solid var(--ms-border)",
              borderRadius: "calc(var(--ms-radius) / 2)",
            }}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Phone (optional)
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-10 px-3 text-base"
          style={{
            backgroundColor: "var(--ms-bg)",
            color: "var(--ms-fg)",
            border: "1px solid var(--ms-border)",
            borderRadius: "calc(var(--ms-radius) / 2)",
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        How can I help?
        <textarea
          required
          rows={5}
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-y px-3 py-2 text-base"
          style={{
            backgroundColor: "var(--ms-bg)",
            color: "var(--ms-fg)",
            border: "1px solid var(--ms-border)",
            borderRadius: "calc(var(--ms-radius) / 2)",
          }}
        />
      </label>
      {/*
        Honeypot — hidden from users (off-screen + aria-hidden + tabIndex=-1)
        but visible to naive bots that fill every <input>. Submissions where
        this is non-empty succeed silently server-side.
      */}
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
        className="inline-flex h-11 items-center justify-center px-6 text-base font-medium disabled:opacity-70"
        style={{
          backgroundColor: "var(--ms-primary)",
          color: "var(--ms-primary-fg)",
          borderRadius: "var(--ms-radius)",
          boxShadow: "var(--ms-shadow)",
        }}
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
      {result.validationErrors && (
        <p className="text-sm text-red-600">
          Please check the fields above and try again.
        </p>
      )}
    </form>
  )
}
