import type { MicroSiteSocialLinks } from "@/types/domain"

const SOCIAL_LABELS: Array<{
  key: keyof MicroSiteSocialLinks
  label: string
}> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "website", label: "Website" },
]

export function MicroSiteFooter({
  professional,
  socialLinks,
}: {
  professional: { fullName: string }
  socialLinks: MicroSiteSocialLinks | null
}) {
  const year = new Date().getFullYear()
  const entries = SOCIAL_LABELS.filter((meta) => {
    const value = socialLinks?.[meta.key]
    return typeof value === "string" && value.length > 0
  })

  return (
    <footer
      className="border-t px-6 py-8"
      style={{ borderColor: "var(--ms-border)", backgroundColor: "var(--ms-surface)" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 text-sm md:flex-row md:items-center">
        <p style={{ color: "var(--ms-muted)" }}>
          © {year} {professional.fullName}
        </p>
        {entries.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {entries.map((entry) => {
              const href = socialLinks?.[entry.key] ?? "#"
              return (
                <li key={entry.key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{
                      border: "1px solid var(--ms-border)",
                      borderRadius: "var(--ms-radius)",
                      color: "var(--ms-fg)",
                    }}
                  >
                    {entry.label}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </footer>
  )
}
