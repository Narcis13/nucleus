// ─────────────────────────────────────────────────────────────────────────────
// Social media layout catalogue.
//
// Each layout is a pure-data description: dimensions, default fields, and a
// suggested category. The actual rendering lives in
// `components/dashboard/marketing/social-canvas.tsx` — pure Canvas 2D so the
// same layout is used for on-screen preview and PNG export without an extra
// dependency.
// ─────────────────────────────────────────────────────────────────────────────

export type SocialPlatform =
  | "instagram_square"
  | "instagram_story"
  | "linkedin_post"
  | "twitter_post"

export type SocialLayoutKind =
  | "motivational"
  | "informational"
  | "promotional"
  | "testimonial"

export type SocialLayout = {
  key: string
  name: string
  kind: SocialLayoutKind
  platform: SocialPlatform
  width: number
  height: number
  defaults: {
    title?: string
    body?: string
    cta?: string
    author?: string
    primaryColor?: string
    secondaryColor?: string
    textColor?: string
  }
}

export const SOCIAL_PLATFORMS: Array<{
  id: SocialPlatform
  label: string
  width: number
  height: number
  description: string
}> = [
  {
    id: "instagram_square",
    label: "Instagram · Square",
    width: 1080,
    height: 1080,
    description: "Classic 1:1 feed post.",
  },
  {
    id: "instagram_story",
    label: "Instagram · Story",
    width: 1080,
    height: 1920,
    description: "9:16 vertical story / reel cover.",
  },
  {
    id: "linkedin_post",
    label: "LinkedIn · Post",
    width: 1200,
    height: 1200,
    description: "1:1 feed image — high resolution for desktop.",
  },
  {
    id: "twitter_post",
    label: "Twitter / X · Post",
    width: 1600,
    height: 900,
    description: "16:9 in-feed card image.",
  },
]

export const SOCIAL_LAYOUTS: SocialLayout[] = [
  {
    key: "motivational_square",
    name: "Motivational quote",
    kind: "motivational",
    platform: "instagram_square",
    width: 1080,
    height: 1080,
    defaults: {
      title: "Small steps every day.",
      body: "Consistency beats intensity.",
      author: "{{professional_name}}",
      primaryColor: "#6366f1",
      secondaryColor: "#f59e0b",
      textColor: "#ffffff",
    },
  },
  {
    key: "motivational_story",
    name: "Motivational story",
    kind: "motivational",
    platform: "instagram_story",
    width: 1080,
    height: 1920,
    defaults: {
      title: "One thing today",
      body: "Pick one. Do it. That's enough.",
      author: "{{professional_name}}",
      primaryColor: "#0f172a",
      secondaryColor: "#f59e0b",
      textColor: "#ffffff",
    },
  },
  {
    key: "informational_square",
    name: "Tip of the day",
    kind: "informational",
    platform: "instagram_square",
    width: 1080,
    height: 1080,
    defaults: {
      title: "Tip of the day",
      body: "Replace this with a single, concrete piece of advice clients can act on immediately.",
      cta: "Save for later",
      primaryColor: "#0891b2",
      secondaryColor: "#f0f9ff",
      textColor: "#0f172a",
    },
  },
  {
    key: "informational_linkedin",
    name: "LinkedIn insight",
    kind: "informational",
    platform: "linkedin_post",
    width: 1200,
    height: 1200,
    defaults: {
      title: "An idea I've been sitting with",
      body: "[Short, specific takeaway from your practice. 2–3 lines.]",
      cta: "What's your take?",
      author: "{{professional_name}}",
      primaryColor: "#1e3a8a",
      secondaryColor: "#fef3c7",
      textColor: "#0f172a",
    },
  },
  {
    key: "promotional_square",
    name: "Offer announcement",
    kind: "promotional",
    platform: "instagram_square",
    width: 1080,
    height: 1080,
    defaults: {
      title: "Now open: [offer name]",
      body: "Spots are limited — reply to DM or tap the link to book.",
      cta: "Book a spot",
      primaryColor: "#db2777",
      secondaryColor: "#fbcfe8",
      textColor: "#ffffff",
    },
  },
  {
    key: "promotional_twitter",
    name: "Twitter promo",
    kind: "promotional",
    platform: "twitter_post",
    width: 1600,
    height: 900,
    defaults: {
      title: "Opening 5 spots this month",
      body: "[One-line description of the offer.]",
      cta: "Link in bio",
      primaryColor: "#0ea5e9",
      secondaryColor: "#f0f9ff",
      textColor: "#ffffff",
    },
  },
  {
    key: "testimonial_square",
    name: "Client testimonial",
    kind: "testimonial",
    platform: "instagram_square",
    width: 1080,
    height: 1080,
    defaults: {
      title: "What clients say",
      body: "“Working with [name] made [specific change] finally feel possible.”",
      author: "— [client first name]",
      primaryColor: "#0f766e",
      secondaryColor: "#ccfbf1",
      textColor: "#ffffff",
    },
  },
  {
    key: "testimonial_linkedin",
    name: "LinkedIn testimonial",
    kind: "testimonial",
    platform: "linkedin_post",
    width: 1200,
    height: 1200,
    defaults: {
      title: "From a recent client",
      body: "“Replace this with a direct quote — pull the sharpest line from the testimonial.”",
      author: "— [client first name]",
      primaryColor: "#1e293b",
      secondaryColor: "#e2e8f0",
      textColor: "#ffffff",
    },
  },
]

export function getSocialLayout(key: string | null | undefined): SocialLayout {
  return (
    SOCIAL_LAYOUTS.find((l) => l.key === key) ?? SOCIAL_LAYOUTS[0]!
  )
}

export function getPlatformMeta(id: SocialPlatform): {
  width: number
  height: number
  label: string
} {
  const meta =
    SOCIAL_PLATFORMS.find((p) => p.id === id) ?? SOCIAL_PLATFORMS[0]!
  return { width: meta.width, height: meta.height, label: meta.label }
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption generator
//
// Given a layout kind + niche keywords, returns 3 caption starters + a pool of
// hashtags to attach. Purely deterministic (no LLM call) — professionals can
// swap or extend after copying into the composer.
// ─────────────────────────────────────────────────────────────────────────────
export function suggestCaption(args: {
  kind: SocialLayoutKind
  title?: string
  body?: string
}): string[] {
  const t = (args.title ?? "").trim()
  const b = (args.body ?? "").trim()

  switch (args.kind) {
    case "motivational":
      return [
        `${t}\n\n${b}\n\nSave this for a day you need it. 🔒`,
        `Reminder: ${t.toLowerCase() || "progress is not linear"}.\n\n${b}`,
        `${t}\n\n${b}\n\nWhich one lands for you today? ⬇️`,
      ]
    case "informational":
      return [
        `${t}\n\n${b}\n\nIf this helps, save the post and share with someone who'd get value.`,
        `Today's tip: ${t.toLowerCase() || "small changes compound"}.\n\n${b}`,
        `${t}\n\n${b}\n\nQuestions? Drop them in the comments.`,
      ]
    case "promotional":
      return [
        `${t}\n\n${b}\n\nDM me or tap the link in bio to join.`,
        `Something new: ${t}.\n\n${b}\n\nLimited spots — booked on a first-come basis.`,
        `${t}\n\n${b}\n\nReady? The link in bio takes you straight there.`,
      ]
    case "testimonial":
      return [
        `${t}\n\n${b}\n\nThanks for the kind words — it's why I do this.`,
        `This is what good work feels like.\n\n${b}`,
        `Client shoutout 👇\n\n${b}\n\nYou can be next.`,
      ]
    default:
      return [`${t}\n\n${b}`]
  }
}

const HASHTAGS_BY_KIND: Record<SocialLayoutKind, string[]> = {
  motivational: [
    "#mondaymotivation",
    "#mindsetmatters",
    "#smallsteps",
    "#progressnotperfection",
    "#selfgrowth",
  ],
  informational: [
    "#tiptuesday",
    "#learnwithme",
    "#quickwin",
    "#howto",
    "#behindthescenes",
  ],
  promotional: [
    "#newoffering",
    "#bookingsopen",
    "#workwithme",
    "#limitedspots",
    "#nowaccepting",
  ],
  testimonial: [
    "#clientlove",
    "#testimonial",
    "#realresults",
    "#thankyou",
    "#whypeoplechooseus",
  ],
}

export function suggestHashtags(kind: SocialLayoutKind): string[] {
  return HASHTAGS_BY_KIND[kind] ?? []
}
