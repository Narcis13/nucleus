"use client"

import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "verified" }
  | { kind: "error"; message: string }

export function PortalSignInClient() {
  const router = useRouter()
  const { signIn } = useSignIn()
  const [email, setEmail] = useState("")
  const [phase, setPhase] = useState<Phase>({ kind: "form" })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn) return
    const trimmed = email.trim()
    if (!trimmed) return
    setPhase({ kind: "submitting" })

    // Step 1: identify the user. `signIn.create` populates `signIn.identifier`
    // and `signIn.supportedFirstFactors` so the email-link factor below knows
    // which email-address record to verify.
    const createRes = await signIn.create({ identifier: trimmed })
    if (createRes.error) {
      setPhase({ kind: "error", message: extractClerkError(createRes.error) })
      return
    }

    // Step 2: send the magic link. `verificationUrl` is what Clerk embeds in
    // the email; once the user clicks it we route them straight to /portal.
    const verificationUrl = new URL("/portal", window.location.origin).toString()
    const sendRes = await signIn.emailLink.sendLink({
      emailAddress: trimmed,
      verificationUrl,
    })
    if (sendRes.error) {
      setPhase({ kind: "error", message: extractClerkError(sendRes.error) })
      return
    }

    setPhase({ kind: "sent", email: trimmed })

    // Step 3: wait for the user to click the link (polled by Clerk SDK), then
    // promote the resulting session to active and route to /portal.
    const waitRes = await signIn.emailLink.waitForVerification()
    if (waitRes.error) {
      setPhase({
        kind: "error",
        message:
          "The link expired before you could open it. Ask your agent to resend access.",
      })
      return
    }

    const verification = signIn.emailLink.verification
    if (!verification || verification.status !== "verified") {
      setPhase({
        kind: "error",
        message:
          "We couldn't verify your link. Ask your agent to resend portal access.",
      })
      return
    }

    const finalizeRes = await signIn.finalize()
    if (finalizeRes.error) {
      setPhase({ kind: "error", message: extractClerkError(finalizeRes.error) })
      return
    }
    setPhase({ kind: "verified" })
    router.replace("/portal")
  }

  if (phase.kind === "sent" || phase.kind === "verified") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{phase.kind === "sent" ? phase.email : ""}</strong>.
          Open it on this device to land back in your portal.
        </p>
        <p className="text-xs text-muted-foreground">
          Wrong address? Ask your agent to resend your portal access.
        </p>
      </Shell>
    )
  }

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
        <Button
          type="submit"
          disabled={phase.kind === "submitting" || !signIn}
          className="w-full"
        >
          {phase.kind === "submitting" ? "Sending…" : "Send sign-in link"}
        </Button>
      </form>
      {phase.kind === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {phase.message}
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

function extractClerkError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const list = (err as { errors?: Array<{ code?: string; message?: string; longMessage?: string }> })
      .errors
    const first = list?.[0]
    // The most useful clarification we can give: when the email isn't on
    // file, Clerk returns a "form_identifier_not_found" code. Surface a
    // direct CTA back to the agent instead of Clerk's generic copy.
    if (first?.code === "form_identifier_not_found") {
      return "We don't recognise that address. Ask your agent to resend your portal link."
    }
    if (first?.longMessage) return first.longMessage
    if (first?.message) return first.message
  }
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message
    if (msg) return msg
  }
  if (err instanceof Error) return err.message
  return "Something went wrong. Try again or ask your agent to resend the link."
}
