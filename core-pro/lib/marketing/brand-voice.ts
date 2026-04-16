// ─────────────────────────────────────────────────────────────────────────────
// Brand voice & tone reference.
//
// Consumed by the marketing workspace's help tooltips, Settings copy, and the
// onboarding hint in the campaign builder. Extracted here so product + marketing
// update the wording without touching React components.
// ─────────────────────────────────────────────────────────────────────────────

export type BrandVoiceSection = {
  title: string
  body: string
  do: string[]
  dont: string[]
}

export const BRAND_VOICE: BrandVoiceSection[] = [
  {
    title: "Who you sound like",
    body: "A trusted expert who speaks like a human. Warm, direct, unsurprised.",
    do: [
      "Use short sentences — one idea each.",
      "Lead with the benefit to the client.",
      "Say what you mean, even when it's less elegant.",
    ],
    dont: [
      "Don't use jargon clients wouldn't use in their own sentences.",
      "Don't front-load credentials.",
      "Don't apologize for selling.",
    ],
  },
  {
    title: "How you sign off",
    body: "Always by name. First name is fine; it's a one-to-one medium.",
    do: [
      "Close emails with just your first name.",
      "Offer a real follow-up path (reply, book, call).",
    ],
    dont: [
      "Don't sign off with 'The Team' — clients know it's you.",
      "Don't add a three-line email signature on marketing sends.",
    ],
  },
  {
    title: "When you promote",
    body: "Describe what it is, who it's for, what it costs. Three lines beats three paragraphs.",
    do: [
      "State spots available (real scarcity only).",
      "Show one testimonial.",
      "Include one clear CTA.",
    ],
    dont: [
      "Don't fabricate deadlines.",
      "Don't stack multiple CTAs.",
    ],
  },
]

// A handful of ready-to-paste captions, organised by typical use. These are
// deliberately generic — the professional adapts them. Use alongside
// `suggestCaption()` for auto-fill, or render as a sidebar when a user opens
// the caption field blank.
export const SAMPLE_CAPTIONS: Array<{
  category: "motivational" | "informational" | "promotional" | "testimonial"
  title: string
  text: string
}> = [
  {
    category: "motivational",
    title: "Short & direct",
    text:
      "The hard part isn't starting. It's starting again on the day after you skipped.\n\nSave this for that day.",
  },
  {
    category: "motivational",
    title: "Question-led",
    text:
      "What's one tiny habit you kept last week that's still paying off this week?\n\nThat's the kind of change I care about — small, quiet, compounding.",
  },
  {
    category: "informational",
    title: "Tip format",
    text:
      "A thing I tell every new client:\n\nBefore you tweak the plan, track the basics for 7 days. You need a baseline, not an opinion.",
  },
  {
    category: "informational",
    title: "Mini-lesson",
    text:
      "Most progress happens on days that feel boring.\n\nThat's the feature, not the bug.",
  },
  {
    category: "promotional",
    title: "Soft announce",
    text:
      "Opening 3 spots this month.\n\nIf we've been in touch about working together, this is your nudge. DM me or tap the link in bio.",
  },
  {
    category: "promotional",
    title: "Offer + reason",
    text:
      "I'm taking on a small cohort of clients specifically for [goal].\n\nIt's a 6-week commitment. Link in bio if you want the full details.",
  },
  {
    category: "testimonial",
    title: "Direct quote",
    text:
      "“I finally stopped second-guessing every decision and just shipped the thing.”\n\nThis is what good work looks like. Thanks, [first name].",
  },
  {
    category: "testimonial",
    title: "Outcome-focused",
    text:
      "From the quieter side of the inbox:\n\n[Replace with a 1–2 sentence outcome a client shared with you.]\n\nSame invite to you if you've been on the fence.",
  },
]
