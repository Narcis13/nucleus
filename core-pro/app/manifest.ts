import type { MetadataRoute } from "next"

// Web App Manifest for PWA installability.
// The start_url intentionally lands on the dashboard so the installed app
// behaves like a task-focused tool rather than the marketing site. Clients
// who install from the portal still hit a friendly landing because the
// dashboard redirects unauthenticated sessions through Clerk.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CorePro",
    short_name: "CorePro",
    description: "The universal CRM for service professionals.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    shortcuts: [
      {
        name: "Appointments",
        short_name: "Appointments",
        description: "Your upcoming schedule",
        url: "/dashboard/appointments",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Messages",
        short_name: "Messages",
        description: "Client conversations",
        url: "/dashboard/messages",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "New Lead",
        short_name: "Lead",
        description: "Capture a new lead",
        url: "/dashboard/leads?new=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    share_target: {
      action: "/api/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "file",
            accept: ["image/*", "application/pdf", "text/*"],
          },
        ],
      },
    },
  }
}
