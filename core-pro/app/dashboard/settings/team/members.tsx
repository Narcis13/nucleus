"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
} from "@/lib/actions/settings"

type Member = {
  id: string
  userId: string
  name: string
  email: string
  imageUrl: string | null
  role: string
}

type Invitation = {
  id: string
  email: string
  role: string
  createdAt: number
}

export function TeamMembers({
  members,
  invitations,
  currentClerkUserId,
}: {
  members: Member[]
  invitations: Invitation[]
  currentClerkUserId: string | null
}) {
  const [email, setEmail] = useState("")

  const invite = useAction(inviteTeamMemberAction, {
    onSuccess() {
      toast.success("Invitation sent")
      setEmail("")
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't invite")
    },
  })

  const remove = useAction(removeTeamMemberAction, {
    onSuccess() {
      toast.success("Member removed")
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't remove")
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            Invite a team member
          </CardTitle>
          <CardDescription>
            Admins share full access to this workspace — clients, appointments,
            billing, and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!email.trim()) return
              invite.execute({ email: email.trim(), role: "admin" })
            }}
          >
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={invite.isExecuting}>
              {invite.isExecuting ? "Sending…" : "Send invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current members ({members.length})</CardTitle>
          <CardDescription>
            Anyone listed here can sign in with their own Clerk account and
            access this workspace as an admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No team members yet. Invite someone above.
            </p>
          ) : (
            members.map((m) => {
              const isSelf = m.userId && m.userId === currentClerkUserId
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {m.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {m.name} {isSelf && <span className="text-muted-foreground">(you)</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      <ShieldCheck className="size-3" />
                      Admin
                    </span>
                    {!isSelf && m.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.execute({ userId: m.userId })}
                        disabled={remove.isExecuting}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Sent — waiting for the invitee to accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{inv.email}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Today every admin has the same access; granular roles are on the
            roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionMatrix />
        </CardContent>
      </Card>
    </div>
  )
}

const PERMS: { label: string; admin: boolean; member: boolean }[] = [
  { label: "View and manage clients", admin: true, member: false },
  { label: "Send invoices and take payments", admin: true, member: false },
  { label: "Edit services and availability", admin: true, member: false },
  { label: "Access billing and plan settings", admin: true, member: false },
  { label: "Invite or remove team members", admin: true, member: false },
  { label: "Access their own portal", admin: false, member: true },
]

function PermissionMatrix() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Capability</th>
            <th className="px-3 py-2 text-center font-medium">Admin</th>
            <th className="px-3 py-2 text-center font-medium">Member</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {PERMS.map((p) => (
            <tr key={p.label}>
              <td className="px-3 py-2">{p.label}</td>
              <td className="px-3 py-2 text-center">{p.admin ? "✓" : "—"}</td>
              <td className="px-3 py-2 text-center">{p.member ? "✓" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
