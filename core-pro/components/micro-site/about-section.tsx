import type { MicroSiteAboutSection } from "@/types/domain"

export function AboutSection({
  section,
  professional,
}: {
  section: MicroSiteAboutSection
  professional: {
    fullName: string
    bio: string | null
    certifications: string[] | null
    specialization: string[] | null
  }
}) {
  if (!section.enabled) return null

  const body = section.body || professional.bio || ""
  // Prefer section-level certifications (editable on the builder), otherwise
  // fall back to the ones on the pro's profile so new sites aren't empty.
  const certifications =
    section.certifications && section.certifications.length > 0
      ? section.certifications
      : (professional.certifications ?? [])

  return (
    <section
      id="about"
      className="px-6 py-20"
      style={{ backgroundColor: "var(--ms-surface)" }}
    >
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          <h2
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--ms-font-heading)" }}
          >
            {section.title || "About"}
          </h2>
          {section.experience_years != null && section.experience_years > 0 && (
            <p
              className="text-sm uppercase tracking-wide"
              style={{ color: "var(--ms-muted)" }}
            >
              {section.experience_years}+ years practising
            </p>
          )}
        </div>
        <div className="space-y-6">
          {body
            .split(/\n{2,}/)
            .filter((p) => p.trim().length > 0)
            .map((paragraph, idx) => (
              <p
                key={idx}
                className="text-lg leading-relaxed"
                style={{ color: "var(--ms-fg)" }}
              >
                {paragraph}
              </p>
            ))}

          {certifications.length > 0 && (
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--ms-muted)" }}
              >
                Certifications
              </h3>
              <ul className="flex flex-wrap gap-2">
                {certifications.map((cert, idx) => (
                  <li
                    key={idx}
                    className="px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--ms-surface-alt)",
                      color: "var(--ms-fg)",
                      border: "1px solid var(--ms-border)",
                      borderRadius: "var(--ms-radius)",
                    }}
                  >
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
