import { FileDown } from "lucide-react"

import type { LeadMagnet } from "@/types/domain"

import { LeadMagnetForm } from "./lead-magnet-form"

// Server-rendered strip that lists the pro's published lead magnets. Each
// magnet ships with an inline form that creates a lead + signed download URL
// when submitted. Kept outside the main section renderer chain on purpose —
// the pro doesn't toggle it in the builder; it's driven by whether lead
// magnets exist.
export function LeadMagnetsSection({
  magnets,
  slug,
}: {
  magnets: LeadMagnet[]
  slug: string
}) {
  if (magnets.length === 0) return null
  return (
    <section
      className="px-4 py-16 md:px-8 lg:px-16"
      style={{
        backgroundColor: "var(--ms-surface-muted, var(--ms-surface))",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <h2
          className="mb-2 text-2xl font-semibold md:text-3xl"
          style={{ color: "var(--ms-fg)" }}
        >
          Free resources
        </h2>
        <p
          className="mb-8 max-w-2xl"
          style={{ color: "var(--ms-muted)" }}
        >
          Download a guide, checklist, or toolkit — on the house.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {magnets.map((magnet) => (
            <article
              key={magnet.id}
              className="flex flex-col gap-4 p-6"
              style={{
                backgroundColor: "var(--ms-surface)",
                border: "1px solid var(--ms-border)",
                borderRadius: "var(--ms-radius)",
                boxShadow: "var(--ms-shadow)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "var(--ms-primary)",
                    color: "var(--ms-primary-fg)",
                  }}
                >
                  <FileDown className="size-5" />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--ms-fg)" }}
                  >
                    {magnet.title}
                  </h3>
                  {magnet.description && (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--ms-muted)" }}
                    >
                      {magnet.description}
                    </p>
                  )}
                </div>
              </div>
              <LeadMagnetForm slug={slug} magnet={magnet} />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
