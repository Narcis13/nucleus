// Fallback shown when a lead-magnet claim link is invalid, expired, or has
// already been used. We never tell the visitor *which* of those it was, just
// that they need a fresh link — same enumeration-resistance posture as the
// portal sign-in error path.
export default function LeadMagnetClaimExpiredPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6f7f9",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          backgroundColor: "#ffffff",
          padding: "32px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          This download link has expired
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#475569",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Each confirmation link can only be used once and is valid for a short
          window. Head back to the page where you requested the download and
          submit the form again — a fresh link will be on its way.
        </p>
      </div>
    </main>
  )
}
