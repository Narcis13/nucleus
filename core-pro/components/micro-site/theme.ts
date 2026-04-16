import type { CSSProperties } from "react"

import type {
  MicroSiteBranding,
  MicroSiteTheme,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Micro-site theme resolver
//
// Produces a flat record of CSS variables that the section components read via
// `style={{ "--ms-primary": "..." }}`. Every theme supplies a full palette;
// professional branding (when set) overrides `--ms-primary` / `--ms-accent`
// on top of the theme so the site still feels on-brand.
//
// Keys are kebab-cased CSS custom properties; components reference them as
// `bg-[var(--ms-bg)]` etc. A single place to tweak the design system.
// ─────────────────────────────────────────────────────────────────────────────

type ThemeTokens = {
  bg: string
  surface: string
  surfaceAlt: string
  fg: string
  muted: string
  border: string
  primary: string
  primaryFg: string
  accent: string
  radius: string
  fontBody: string
  fontHeading: string
  shadow: string
  heroBg: string
}

const THEMES: Record<MicroSiteTheme, ThemeTokens> = {
  default: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",
    fg: "#0f172a",
    muted: "#475569",
    border: "#e2e8f0",
    primary: "#6366f1",
    primaryFg: "#ffffff",
    accent: "#f59e0b",
    radius: "14px",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    fontHeading: "var(--font-geist-sans), system-ui, sans-serif",
    shadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    heroBg: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  },
  modern: {
    bg: "#0b1120",
    surface: "#111827",
    surfaceAlt: "#0f172a",
    fg: "#f8fafc",
    muted: "#94a3b8",
    border: "rgba(148, 163, 184, 0.18)",
    primary: "#38bdf8",
    primaryFg: "#0b1120",
    accent: "#facc15",
    radius: "18px",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    fontHeading: "var(--font-geist-sans), system-ui, sans-serif",
    shadow: "0 10px 30px rgba(2, 6, 23, 0.35)",
    heroBg:
      "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 50%), #0b1120",
  },
  warm: {
    bg: "#fdf6ef",
    surface: "#ffffff",
    surfaceAlt: "#fbeedd",
    fg: "#4a2d18",
    muted: "#7c5b41",
    border: "#f1d9bf",
    primary: "#c2410c",
    primaryFg: "#ffffff",
    accent: "#14b8a6",
    radius: "20px",
    fontBody: "var(--font-geist-sans), Georgia, serif",
    fontHeading: "Georgia, 'Times New Roman', serif",
    shadow: "0 2px 8px rgba(74, 45, 24, 0.08)",
    heroBg: "linear-gradient(135deg, #fff1e0 0%, #fdf6ef 100%)",
  },
  minimal: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#fafafa",
    fg: "#111111",
    muted: "#6b6b6b",
    border: "#ebebeb",
    primary: "#111111",
    primaryFg: "#ffffff",
    accent: "#2563eb",
    radius: "6px",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    fontHeading: "var(--font-geist-sans), system-ui, sans-serif",
    shadow: "none",
    heroBg: "#ffffff",
  },
  bold: {
    bg: "#fff8f0",
    surface: "#ffffff",
    surfaceAlt: "#fde68a",
    fg: "#1e1b4b",
    muted: "#4338ca",
    border: "#1e1b4b",
    primary: "#ec4899",
    primaryFg: "#ffffff",
    accent: "#22d3ee",
    radius: "22px",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    fontHeading: "var(--font-geist-sans), system-ui, sans-serif",
    shadow: "6px 6px 0 rgba(30, 27, 75, 1)",
    heroBg: "linear-gradient(120deg, #fde68a 0%, #fbcfe8 100%)",
  },
}

function isValidTheme(t: string): t is MicroSiteTheme {
  return Object.prototype.hasOwnProperty.call(THEMES, t)
}

export function resolveTheme(
  theme: string | null | undefined,
  branding: MicroSiteBranding,
): {
  theme: MicroSiteTheme
  tokens: ThemeTokens
  style: CSSProperties
} {
  const name: MicroSiteTheme = theme && isValidTheme(theme) ? theme : "default"
  const base = THEMES[name]

  const tokens: ThemeTokens = {
    ...base,
    primary: branding.primary_color || base.primary,
    accent: branding.accent_color || branding.secondary_color || base.accent,
  }

  const style: CSSProperties = {
    ["--ms-bg" as string]: tokens.bg,
    ["--ms-surface" as string]: tokens.surface,
    ["--ms-surface-alt" as string]: tokens.surfaceAlt,
    ["--ms-fg" as string]: tokens.fg,
    ["--ms-muted" as string]: tokens.muted,
    ["--ms-border" as string]: tokens.border,
    ["--ms-primary" as string]: tokens.primary,
    ["--ms-primary-fg" as string]: tokens.primaryFg,
    ["--ms-accent" as string]: tokens.accent,
    ["--ms-radius" as string]: tokens.radius,
    ["--ms-shadow" as string]: tokens.shadow,
    ["--ms-hero-bg" as string]: tokens.heroBg,
    ["--ms-font-body" as string]: tokens.fontBody,
    ["--ms-font-heading" as string]: tokens.fontHeading,
    fontFamily: "var(--ms-font-body)",
    backgroundColor: "var(--ms-bg)",
    color: "var(--ms-fg)",
  }

  return { theme: name, tokens, style }
}
