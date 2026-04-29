"use client"

import { useEffect } from "react"

// Global error boundary — catches errors that escape the root layout.
// Must render its own <html> + <body> since the root layout itself may
// have failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ color: "#6b7280", maxWidth: "28rem", marginTop: "0.5rem" }}>
              A critical error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  marginTop: "0.5rem",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try again
            </button>
            <a
              href="mailto:support@corepro.app"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                background: "transparent",
                color: "#111827",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Contact support
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
