"use client"

import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

type Status = "loading" | "ready_signup" | "signing_in" | "signing_up" | "error"

export function AcceptInviteClient() {
  const params = useSearchParams()
  const router = useRouter()
  const ticket = params.get("__clerk_ticket")
  const clerkStatus = params.get("__clerk_status")

  const { signIn } = useSignIn()
  const { signUp } = useSignUp()

  const [uiStatus, setUiStatus] = useState<Status>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Effect can fire twice in dev strict-mode; guard so the ticket is consumed
  // once. Clerk rejects a second `signIn.ticket({ ticket })` with the same
  // ticket once it's been redeemed.
  const startedRef = useRef(false)

  const goToPortal = useCallback(() => {
    router.replace("/portal")
  }, [router])

  // Existing user: activate the ticket via signIn.ticket(). On success the
  // future updates `status` → `'complete'`; finalize() promotes the
  // session to active. We then route to /portal.
  const completeSignIn = useCallback(async () => {
    if (!signIn || !ticket) return
    setUiStatus("signing_in")
    const { error } = await signIn.ticket({ ticket })
    if (error) {
      setErrorMessage(extractClerkError(error))
      setUiStatus("error")
      return
    }
    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize()
      if (finalizeError) {
        setErrorMessage(extractClerkError(finalizeError))
        setUiStatus("error")
        return
      }
      goToPortal()
      return
    }
    setErrorMessage(
      "We couldn't sign you in automatically. Ask your agent to send a fresh link.",
    )
    setUiStatus("error")
  }, [goToPortal, signIn, ticket])

  // First-time user: signUp.ticket() prefills email + org from the ticket.
  // With password + first/last name disabled in dashboard config, the sign-up
  // is one call away from `'complete'`. finalize() activates the session.
  const completeSignUp = useCallback(async () => {
    if (!signUp || !ticket) return
    setUiStatus("signing_up")
    const { error } = await signUp.ticket({ ticket })
    if (error) {
      setErrorMessage(extractClerkError(error))
      setUiStatus("error")
      return
    }
    if (signUp.status === "complete") {
      const { error: finalizeError } = await signUp.finalize()
      if (finalizeError) {
        setErrorMessage(extractClerkError(finalizeError))
        setUiStatus("error")
        return
      }
      goToPortal()
      return
    }
    setErrorMessage(
      "We couldn't finish setting up your account. Ask your agent to resend the link.",
    )
    setUiStatus("error")
  }, [goToPortal, signUp, ticket])

  useEffect(() => {
    if (startedRef.current) return
    if (!ticket) {
      setErrorMessage(
        "This link is missing its access ticket. Ask your agent to resend it.",
      )
      setUiStatus("error")
      startedRef.current = true
      return
    }

    if (clerkStatus === "complete") {
      startedRef.current = true
      goToPortal()
      return
    }

    if (clerkStatus === "sign_in" && signIn) {
      startedRef.current = true
      void completeSignIn()
      return
    }

    if (clerkStatus === "sign_up" && signUp) {
      startedRef.current = true
      // One-button confirm screen instead of auto-creating, so the first-time
      // user has a moment to read what's about to happen.
      setUiStatus("ready_signup")
      return
    }
  }, [clerkStatus, completeSignIn, goToPortal, signIn, signUp, ticket])

  if (uiStatus === "loading" || uiStatus === "signing_in" || uiStatus === "signing_up") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {uiStatus === "signing_up"
            ? "Setting up your portal…"
            : "Signing you in…"}
        </p>
      </div>
    )
  }

  if (uiStatus === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Couldn&apos;t open the portal</h1>
        <p className="text-sm text-muted-foreground">
          {errorMessage ??
            "Something went wrong. Ask your agent for a fresh link."}
        </p>
      </div>
    )
  }

  // ready_signup
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Welcome to your portal</h1>
      <p className="text-sm text-muted-foreground">
        Confirm to finish setting up your account. No password required — your
        agent can send you a fresh link any time you need to sign back in.
      </p>
      <Button onClick={() => void completeSignUp()} className="w-full">
        Open my portal
      </Button>
    </div>
  )
}

type ClerkErrorLike =
  | { errors?: Array<{ longMessage?: string; message?: string; code?: string }> }
  | { message?: string }
  | Error
  | null
  | undefined
  | unknown

function extractClerkError(err: ClerkErrorLike): string {
  if (err && typeof err === "object" && "errors" in err) {
    const list = (err as { errors?: Array<{ longMessage?: string; message?: string }> })
      .errors
    const first = list?.[0]
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
