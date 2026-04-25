"use client"

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

type Status = "loading" | "ready_signup" | "signing_in" | "signing_up" | "error"

export function AcceptInviteClient() {
  const params = useSearchParams()
  const router = useRouter()
  const ticket = params.get("__clerk_ticket")
  const clerkStatus = params.get("__clerk_status")
  const inviteEmail = params.get("email")

  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()

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

    console.error("[accept-invite] after signIn.ticket()", {
      status: signIn.status,
      identifier: signIn.identifier,
      supportedFirstFactors: signIn.supportedFirstFactors,
      supportedSecondFactors: signIn.supportedSecondFactors,
      firstFactorVerification: signIn.firstFactorVerification,
      secondFactorVerification: signIn.secondFactorVerification,
      createdSessionId: signIn.createdSessionId,
      error,
    })

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
      `We couldn't sign you in automatically (status="${signIn.status}"). Ask your agent to send a fresh link.`,
    )
    setUiStatus("error")
  }, [goToPortal, signIn, ticket])

  // First-time user: signUp.ticket() prefills email + org from the ticket.
  // With password + first/last name disabled in dashboard config, the sign-up
  // is one call away from `'complete'`. finalize() activates the session.
  const completeSignUp = useCallback(async () => {
    if (!signUp || !ticket) return
    // Race guard: if Clerk's session loaded between mount and the button
    // click, jump straight to the portal — `signUp.ticket()` would otherwise
    // 400 with "You're already signed in."
    if (isSignedIn) {
      goToPortal()
      return
    }
    setUiStatus("signing_up")
    // Pass emailAddress alongside the ticket. `signUp.ticket(...)` is a
    // shorthand for `signUp.create({ strategy: "ticket", ticket })` and
    // doesn't accept extra fields, so we use the verbose form instead — this
    // way Clerk has the email at create time and won't list it as missing.
    const { error } = await signUp.create({
      strategy: "ticket",
      ticket,
      ...(inviteEmail ? { emailAddress: inviteEmail.trim().toLowerCase() } : {}),
    })
    if (error) {
      // Clerk returns this when a stale session cookie is in the browser
      // (typically from a half-finished previous attempt). Treat it as
      // success — the user is already authenticated, just route them in.
      if (isClerkErrorCode(error, "session_exists")) {
        goToPortal()
        return
      }
      setErrorMessage(extractClerkError(error))
      setUiStatus("error")
      return
    }

    console.error("[accept-invite] after signUp.ticket()", {
      status: signUp.status,
      emailAddress: signUp.emailAddress,
      missingFields: signUp.missingFields,
      unverifiedFields: signUp.unverifiedFields,
      requiredFields: signUp.requiredFields,
      createdSessionId: signUp.createdSessionId,
      inviteEmailFromUrl: inviteEmail,
    })

    // Status "complete" must still go through .finalize() below — it's what
    // actually activates the session in the browser. `createdSessionId` being
    // set only means the session exists on the backend; without finalize the
    // session cookie isn't written, so /portal would bounce through /sign-in.
    //
    // Only short-circuit when status is *not* complete but a session was
    // created anyway (defensive — .finalize() requires status === "complete").
    if (signUp.status !== "complete" && signUp.createdSessionId) {
      goToPortal()
      return
    }

    // If Clerk says more is required, log + surface exactly what so we can
    // either disable that requirement in the Clerk dashboard or collect it
    // here. Common culprits: first_name, last_name, password, captcha.
    if (signUp.status !== "complete") {
      console.error("[accept-invite] signUp not complete after ticket()", {
        status: signUp.status,
        missingFields: signUp.missingFields,
        unverifiedFields: signUp.unverifiedFields,
        requiredFields: signUp.requiredFields,
      })
      setErrorMessage(
        `Clerk requires more info — status="${signUp.status}", missing=${JSON.stringify(signUp.missingFields)}. Check the dashboard's user-attribute settings.`,
      )
      setUiStatus("error")
      return
    }

    const { error: finalizeError } = await signUp.finalize()
    if (finalizeError) {
      setErrorMessage(extractClerkError(finalizeError))
      setUiStatus("error")
      return
    }
    goToPortal()
  }, [goToPortal, inviteEmail, isSignedIn, signUp, ticket])

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

    // Stale session from a half-finished previous attempt → just send them in.
    // Clerk would otherwise reject signUp.ticket() with "user already logged in".
    if (authLoaded && isSignedIn) {
      startedRef.current = true
      goToPortal()
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
  }, [authLoaded, clerkStatus, completeSignIn, goToPortal, isSignedIn, signIn, signUp, ticket])

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
      {/* Mount point for Clerk's Smart CAPTCHA — required before signUp.ticket().
          Without it Clerk falls back to invisible CAPTCHA and often fails. */}
      <div id="clerk-captcha" />
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

function isClerkErrorCode(err: unknown, code: string): boolean {
  if (!err || typeof err !== "object" || !("errors" in err)) return false
  const list = (err as { errors?: Array<{ code?: string }> }).errors
  return Array.isArray(list) && list.some((e) => e.code === code)
}

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
