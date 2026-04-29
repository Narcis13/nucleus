"use client"

import { useAction } from "next-safe-action/hooks"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { requestPortalLinkAction } from "./actions"

// Verify-route bounce-back errors. Kept narrow so an attacker can't render
// arbitrary text by tampering with the query string.
const VERIFY_ERROR_COPY: Record<string, string> = {
  expired:
    "That sign-in link has expired or already been used. Request a fresh one below.",
  invalid:
    "That sign-in link doesn't look right. Request a fresh one below.",
}

export function PortalSignInClient() {
  const params = useSearchParams()
  const verifyError = VERIFY_ERROR_COPY[params.get("error") ?? ""] ?? null
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState<string | null>(null)

  const { execute, isExecuting, result } = useAction(requestPortalLinkAction, {
    onSuccess: () => {
      // Snapshot the address that was actually submitted (the input might
      // have been edited between submit and success, though it's a quick
      // round-trip in practice).
      setSubmitted(email.trim())
    },
  })

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    execute({ email: trimmed })
  }

  // After a successful submit we show the same "check your email" screen
  // regardless of whether the email matched a known client — preventing
  // enumeration of valid portal addresses.
  if (submitted) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If <strong>{submitted}</strong> is registered for a portal, we&apos;ve
          sent a one-tap sign-in link. Open it on this device to land back in
          your portal.
        </p>
        <p className="text-xs text-muted-foreground">
          Wrong address? Ask your agent to resend your portal access.
        </p>
      </Shell>
    )
  }

  const errorMessage = result.serverError ?? null

  return (
    <Shell>
      <h1 className="text-xl font-semibold">Sign in to your portal</h1>
      <p className="text-sm text-muted-foreground">
        Enter the email your agent uses for you. We&apos;ll send a one-tap
        sign-in link — no password needed.
      </p>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
        <Input
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" disabled={isExecuting} className="w-full">
          {isExecuting ? "Sending…" : "Send sign-in link"}
        </Button>
      </form>
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      {!errorMessage && verifyError && (
        <p className="text-sm text-destructive" role="alert">
          {verifyError}
        </p>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      {children}
    </div>
  )
}
