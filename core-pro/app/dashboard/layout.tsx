export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh">
      {/* TODO: sidebar + topbar + org context */}
      {children}
    </div>
  )
}
