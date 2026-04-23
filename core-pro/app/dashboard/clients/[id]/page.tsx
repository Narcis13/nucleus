import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Mail, Phone } from "lucide-react"

import { ClientProfileTabs } from "@/components/dashboard/clients/client-profile-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  getClientActivity,
  getClientDocuments,
  getClientForms,
  getClientInvoices,
  getClientWithRelationship,
  getTags,
} from "@/lib/db/queries/clients"
import { getProfessional } from "@/lib/db/queries/professionals"

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Parallel fetches — all scoped by RLS to the current professional.
  const [detail, activity, documents, forms, invoices, allTags, professional] =
    await Promise.all([
      getClientWithRelationship(id),
      getClientActivity(id),
      getClientDocuments(id),
      getClientForms(id),
      getClientInvoices(id),
      getTags(),
      getProfessional(),
    ])

  if (!detail) notFound()
  if (!professional) notFound()

  const { client, relationship, tags } = detail
  const initials = client.fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/clients" />}
          className="mb-2 -ml-2 text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Back to clients
        </Button>
        <PageHeader
          title={client.fullName}
          description={`Joined ${new Date(client.createdAt).toLocaleDateString()}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <a href={`mailto:${client.email}`}>
                    <Mail className="size-3.5" />
                    Email
                  </a>
                }
              />
              {client.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a href={`tel:${client.phone}`}>
                      <Phone className="size-3.5" />
                      Call
                    </a>
                  }
                />
              )}
            </div>
          }
        />
      </div>

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {client.email}
          </p>
          {client.phone && (
            <p className="truncate text-sm text-muted-foreground">
              {client.phone}
            </p>
          )}
        </div>
      </div>

      <ClientProfileTabs
        client={client}
        relationship={relationship}
        assignedTags={tags}
        allTags={allTags}
        activity={activity}
        documents={documents}
        forms={forms}
        invoices={invoices}
        professionalId={professional.id}
      />
    </div>
  )
}
