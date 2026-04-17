"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteAccountAction } from "@/lib/actions/settings"

// ─────────────────────────────────────────────────────────────────────────────
// <DangerZone>
//
// Two steps guard the delete:
//   1. User types their exact email into the confirmation field.
//   2. Submit → server action deletes the Clerk user (and its org). The
//      Clerk webhook cascades the professional row and every dependent record.
//
// We also call Clerk's `signOut` on success so the user lands on the marketing
// home page immediately rather than hitting a dead dashboard request.
// ─────────────────────────────────────────────────────────────────────────────

export function DangerZone({
  email,
  fullName,
}: {
  email: string
  fullName: string
}) {
  const router = useRouter()
  const { signOut } = useClerk()
  const [confirm, setConfirm] = useState("")

  const { execute, isExecuting } = useAction(deleteAccountAction, {
    async onSuccess() {
      toast.success("Account deleted — signing you out.")
      try {
        await signOut()
      } catch {
        /* best-effort — redirect anyway */
      }
      router.replace("/")
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't delete account")
    },
  })

  const typedMatches = confirm.trim().toLowerCase() === email.trim().toLowerCase()

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            Delete account
          </CardTitle>
          <CardDescription>
            Permanently removes <span className="font-medium">{fullName}</span>
            &apos;s workspace — including every client, appointment, document,
            invoice, message, and uploaded file. Your Stripe subscription will
            also be cancelled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>This cannot be undone.</li>
            <li>Invited clients will immediately lose portal access.</li>
            <li>
              GDPR obligations (e.g. tax records) may require us to retain
              some anonymised data &mdash; the fully-signed DPA spells out
              exactly what.
            </li>
          </ul>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-email">
              Type your email ({email}) to confirm
            </Label>
            <Input
              id="confirm-email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={!typedMatches || isExecuting}
          onClick={() => execute({ confirmEmail: confirm.trim() })}
        >
          {isExecuting ? "Deleting…" : "Permanently delete my account"}
        </Button>
      </div>
    </div>
  )
}
